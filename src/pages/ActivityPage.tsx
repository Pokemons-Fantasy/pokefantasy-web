import { Fragment, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { getActivityFeed } from '../api/activity';
import type { ActivityEvent } from '../api/activity';
import { useAuthStore } from '../store/authStore';
import { useLastSeen } from '../hooks/useLastSeen';
import { usePoolSprites } from '../hooks/usePoolSprites';
import { SkeletonTable } from '../components/SkeletonTable';
import ActivityRow from '../components/activity/ActivityRow';
import { ACTIVITY_FILTERS, firstSeenEventId, groupByDay } from '../utils/activity';
import { useLayoutMode } from '../hooks/useLayoutMode';
import styles from './ActivityPage.module.css';

export default function ActivityPage() {
  const { leagueId } = useParams<{ leagueId: string }>();
  // Una instancia por liga: la marca de última visita y los filtros son de cada liga
  return <LeagueActivity key={leagueId} leagueId={leagueId!} />;
}

function LeagueActivity({ leagueId }: { leagueId: string }) {
  const username = useAuthStore((s) => s.username);
  const mobile = useLayoutMode() === 'mobile';
  const [filterKey, setFilterKey] = useState(ACTIVITY_FILTERS[0].key);
  const [onlyMine, setOnlyMine] = useState(false);
  const filter = ACTIVITY_FILTERS.find((f) => f.key === filterKey) ?? ACTIVITY_FILTERS[0];

  const spriteByName = usePoolSprites(leagueId);

  const typeButton = (f: (typeof ACTIVITY_FILTERS)[number]) => (
    <button
      key={f.key}
      type="button"
      className={`gen-tab${f.key === filterKey ? ' active' : ''}`}
      aria-pressed={f.key === filterKey}
      onClick={() => setFilterKey(f.key)}
    >
      {f.label}
    </button>
  );
  const mineButton = username && (
    <button
      type="button"
      className={`gen-tab${onlyMine ? ' active' : ''}`}
      aria-pressed={onlyMine}
      onClick={() => setOnlyMine((v) => !v)}
    >
      Solo lo mío
    </button>
  );

  return (
    <main className="page-content">
      {mobile ? (
        // En móvil la barra inferior ya marca la sección, y los filtros van en una sola tira deslizable
        <>
          <h1 className="sr-only">Actividad</h1>
          <div className={styles.strip} role="group" aria-label="Filtros de actividad">
            {typeButton(ACTIVITY_FILTERS[0])}
            {mineButton}
            {ACTIVITY_FILTERS.slice(1).map(typeButton)}
          </div>
        </>
      ) : (
        <>
          <div className="section-header">
            <div>
              <h1 className="page-title">Actividad</h1>
              <p className="page-subtitle">Se actualiza cada 30 s</p>
            </div>
          </div>

          <div className="activity-filters">
            <div className="gen-tabs" role="group" aria-label="Tipo de evento">
              {ACTIVITY_FILTERS.map(typeButton)}
            </div>
            {mineButton}
          </div>
        </>
      )}

      {/* Otra lista por filtro: la paginación acumulada empieza de cero */}
      <ActivityFeed
        key={`${filter.key}-${onlyMine}`}
        leagueId={leagueId}
        types={filter.types}
        username={onlyMine ? username ?? undefined : undefined}
        spriteByName={spriteByName}
        filtered={filter.key !== 'all' || onlyMine}
      />
    </main>
  );
}

interface ActivityFeedProps {
  leagueId: string;
  types: ActivityEvent['type'][];
  username: string | undefined;
  spriteByName: Map<string, string>;
  /** Con filtro no se mueve la marca de última visita (solo cuenta el feed completo). */
  filtered: boolean;
}

function ActivityFeed({ leagueId, types, username, spriteByName, filtered }: ActivityFeedProps) {
  const [page, setPage] = useState(0);
  const [events, setEvents] = useState<ActivityEvent[]>([]);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['activity', leagueId, types.join(','), username ?? '', page],
    queryFn: () => getActivityFeed(leagueId, page, { username, types }),
    staleTime: 20_000,
    refetchInterval: 30_000,
  });

  // Acumula las páginas cargadas y los eventos nuevos del refresco de la página 0. Necesita estado:
  // un `select` de React Query solo ve el resultado de la consulta actual.
  useEffect(() => {
    if (!data) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEvents((prev) => {
      const incoming = new Set(data.events.map((e) => e.id));
      const rest = prev.filter((e) => !incoming.has(e.id));
      const merged = page === 0 ? [...data.events, ...rest] : [...rest, ...data.events];
      const unchanged = merged.length === prev.length && merged.every((e, i) => e.id === prev[i]?.id);
      return unchanged ? prev : merged;
    });
  }, [data, page]);

  // Por usuario y liga: en un navegador compartido, lo que vio uno no cuenta como visto para otro
  const viewer = useAuthStore((s) => s.username);
  const lastSeen = useLastSeen(`pf:activity-last-seen:${viewer}:${leagueId}`, filtered ? undefined : events[0]?.createdAt);
  const seenFrom = filtered ? null : firstSeenEventId(events, lastSeen);
  const groups = groupByDay(events, new Date());

  if (isLoading && events.length === 0) return <SkeletonTable rows={5} />;

  if (events.length === 0) {
    return (
      <div className="empty-state">
        <p>{filtered ? 'No hay actividad con este filtro.' : 'No hay actividad en esta liga todavía.'}</p>
      </div>
    );
  }

  const hasMore = data?.hasMore ?? false;

  return (
    <div className="activity-feed">
      {groups.map((group) => {
        const headingId = `activity-day-${group.events[0].id}`;
        return (
          <section key={headingId} aria-labelledby={headingId}>
            <h2 id={headingId} className="activity-day">{group.label}</h2>
            <ol className="activity-list">
              {group.events.map((event) => (
                <Fragment key={event.id}>
                  {event.id === seenFrom && (
                    <li className="activity-seen-divider"><span>Tu última visita</span></li>
                  )}
                  <ActivityRow event={event} spriteByName={spriteByName} />
                </Fragment>
              ))}
            </ol>
          </section>
        );
      })}

      {hasMore ? (
        <button type="button" className="btn-ghost activity-more" onClick={() => setPage((p) => p + 1)} disabled={isFetching}>
          {isFetching ? 'Cargando…' : 'Cargar más'}
        </button>
      ) : (
        <p className="activity-end">Fin del historial</p>
      )}
    </div>
  );
}
