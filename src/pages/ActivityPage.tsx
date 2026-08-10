import { useState, useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { getActivityFeed } from '../api/activity';
import PageHeader from '../components/PageHeader';
import type { ActivityEvent } from '../api/activity';

// ── Event formatting ──────────────────────────────────────────────────────────

interface EventDisplay {
  text: string;
  color: string;
  icon: string;
  label: string;
}

function formatEvent(event: ActivityEvent): EventDisplay {
  const actor = event.actorUsername;
  const target = event.targetUsername ?? '?';
  const pokemon = event.pokemonName ?? '?';
  const pokemon2 = event.pokemonName2 ?? '?';
  const coins = event.coinsAmount ?? 0;
  const round = event.roundNumber ?? '?';
  const fromTier = event.fromTier ?? '?';
  const toTier = event.toTier ?? '?';

  switch (event.type) {
    case 'STEAL':
      return {
        text: `${actor} robó a ${pokemon} de ${target} · pagó ${coins} monedas`,
        color: '#10b981',
        icon: '⚡',
        label: 'Robo',
      };
    case 'BENCH_SWAP':
      return {
        text: `${actor} swap de banca: ${pokemon} ↔ ${pokemon2}`,
        color: '#8b5cf6',
        icon: '↔',
        label: 'Banca',
      };
    case 'BENCH_PURCHASE':
      return {
        text: `${actor} compró ${pokemon} de la banca por ${coins} monedas`,
        color: '#f59e0b',
        icon: '🛒',
        label: 'Compra',
      };
    case 'TRADE_COMPLETED':
      return {
        text: `${actor} y ${target} completaron un trade: ${pokemon} ↔ ${pokemon2}`,
        color: '#3b82f6',
        icon: '🤝',
        label: 'Trade',
      };
    case 'MATCH_RESULT':
      return {
        text: `${actor} ganó a ${target} en jornada ${round}`,
        color: '#eab308',
        icon: '🏆',
        label: 'Partido',
      };
    case 'TIER_CHANGE':
      return {
        text: `${pokemon} cambiado de tier ${fromTier} → ${toTier}`,
        color: '#ec4899',
        icon: '◈',
        label: 'Tier',
      };
    case 'COIN_EARNED':
      return {
        text: `${actor} ganó +${coins} monedas`,
        color: '#f59e0b',
        icon: '●',
        label: 'Monedas',
      };
    default:
      return { text: 'Evento desconocido', color: '#52525b', icon: '?', label: 'Desconocido' };
  }
}

// ── Relative time ─────────────────────────────────────────────────────────────

function relativeTime(isoDate: string): string {
  const now = Date.now();
  const then = new Date(isoDate).getTime();
  const diffMs = now - then;
  const diffSec = Math.floor(diffMs / 1000);

  if (diffSec < 60) return 'hace un momento';

  const rtf = new Intl.RelativeTimeFormat('es', { numeric: 'auto' });

  if (diffSec < 3600) return rtf.format(-Math.floor(diffSec / 60), 'minute');
  if (diffSec < 86400) return rtf.format(-Math.floor(diffSec / 3600), 'hour');
  return rtf.format(-Math.floor(diffSec / 86400), 'day');
}

// ── Skeleton loader ───────────────────────────────────────────────────────────

function SkeletonFeed() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="skeleton"
          style={{ height: '72px', borderRadius: 'var(--radius)', opacity: 1 - i * 0.15 }}
        />
      ))}
    </div>
  );
}

// ── Event card ────────────────────────────────────────────────────────────────

interface EventCardProps {
  event: ActivityEvent;
  isRecent: boolean;
}

function EventCard({ event, isRecent }: EventCardProps) {
  const display = formatEvent(event);

  return (
    <div
      className="activity-card animate-in-fast"
      style={{
        borderLeft: `4px solid ${display.color}`,
        background: 'var(--surface)',
        borderRadius: '0 var(--radius-sm) var(--radius-sm) 0',
        padding: '0.9rem 1.1rem',
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        position: 'relative',
        boxShadow: isRecent ? `0 0 0 1px ${display.color}22, 0 2px 12px rgba(0,0,0,0.3)` : '0 1px 4px rgba(0,0,0,0.3)',
        transition: 'box-shadow 0.2s',
      }}
    >
      {/* Type icon */}
      <div
        style={{
          width: '36px',
          height: '36px',
          borderRadius: '50%',
          background: `${display.color}18`,
          border: `1px solid ${display.color}44`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1rem',
          flexShrink: 0,
          color: display.color,
          fontStyle: 'normal',
        }}
        aria-hidden="true"
      >
        {display.icon}
      </div>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: '0.875rem',
            color: 'var(--text)',
            lineHeight: 1.4,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
          title={display.text}
        >
          {display.text}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
          <span
            style={{
              fontSize: '0.7rem',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: display.color,
              opacity: 0.85,
            }}
          >
            {display.label}
          </span>
          <span style={{ color: 'var(--text-3)', fontSize: '0.7rem' }}>·</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>
            {relativeTime(event.createdAt)}
          </span>
        </div>
      </div>

      {/* Recent pulse dot */}
      {isRecent && (
        <div
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: display.color,
            flexShrink: 0,
            animation: 'pulseGlow 2s ease-in-out infinite',
            boxShadow: `0 0 6px ${display.color}`,
          }}
          aria-label="Reciente"
        />
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ActivityPage() {
  const { leagueId } = useParams<{ leagueId: string }>();
  const navigate = useNavigate();

  const [page, setPage] = useState(0);
  const [allEvents, setAllEvents] = useState<ActivityEvent[]>([]);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['activity', leagueId, page],
    queryFn: () => getActivityFeed(leagueId!, page),
    enabled: !!leagueId,
    staleTime: 20_000,
    refetchInterval: 30_000,
  });

  // Accumulate events when new pages load
  useEffect(() => {
    if (!data) return;
    setAllEvents((prev) => {
      const incomingIds = new Set(data.events.map((e) => e.id));
      const dedupedExisting = prev.filter((e) => !incomingIds.has(e.id));

      // Only add page-0 events at the front (auto-refresh), others at the end
      const merged =
        page === 0
          ? [...data.events, ...dedupedExisting.filter((e) => !data.events.some((d) => d.id === e.id))]
          : [...dedupedExisting, ...data.events];

      const unchanged = merged.length === prev.length && merged.every((e, i) => e.id === prev[i]?.id);
      return unchanged ? prev : merged;
    });
  }, [data, page]);

  const handleLoadMore = useCallback(() => {
    setPage((p) => p + 1);
  }, []);

  const hasMore = data?.hasMore ?? false;
  const totalPages = data?.totalPages ?? 1;
  const isFirstLoad = isLoading && allEvents.length === 0;

  // Events from the last 5 minutes count as "recent"
  const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;

  return (
    <div className="page-wrapper">
      <PageHeader left={
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button className="btn-back" onClick={() => navigate(`/leagues/${leagueId}`)}>← Liga</button>
          <span className="logo" onClick={() => navigate('/leagues')}>PokeFantasy</span>
        </div>
      } />

      <main className="page-content">
        {/* Section header */}
        <div className="section-header" style={{ marginBottom: '2rem' }}>
          <div>
            <h1 className="page-title">Actividad</h1>
            <p className="page-subtitle">
              Historial de eventos de la liga — actualiza cada 30s
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {isFetching && !isFirstLoad && (
              <span className="loading-text" style={{ fontSize: '0.8rem' }}>
                <span className="spinner" style={{ width: '14px', height: '14px' }} />
                Actualizando
              </span>
            )}
            <button
              className="btn-ghost"
              onClick={() => navigate(`/leagues/${leagueId}/teams`)}
            >
              Equipos
            </button>
          </div>
        </div>

        {/* Legend */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.5rem',
            marginBottom: '1.75rem',
          }}
        >
          {(
            [
              { label: 'Robo', color: '#10b981' },
              { label: 'Banca', color: '#8b5cf6' },
              { label: 'Trade', color: '#3b82f6' },
              { label: 'Partido', color: '#eab308' },
              { label: 'Tier', color: '#ec4899' },
              { label: 'Monedas', color: '#f59e0b' },
            ] as const
          ).map(({ label, color }) => (
            <span
              key={label}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.2rem 0.65rem',
                borderRadius: '999px',
                border: `1px solid ${color}44`,
                background: `${color}0f`,
                fontSize: '0.7rem',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: color,
              }}
            >
              <span
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: color,
                  display: 'inline-block',
                  flexShrink: 0,
                }}
              />
              {label}
            </span>
          ))}
        </div>

        {/* Feed */}
        {isFirstLoad ? (
          <SkeletonFeed />
        ) : allEvents.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '4rem 2rem',
              color: 'var(--text-3)',
            }}
          >
            <div
              style={{
                fontSize: '2.5rem',
                marginBottom: '1rem',
                opacity: 0.4,
              }}
            >
              ◌
            </div>
            <p style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--text-2)' }}>
              No hay actividad en esta liga todavía
            </p>
            <p style={{ fontSize: '0.875rem', marginTop: '0.4rem' }}>
              Aquí aparecerán robos, trades, partidos y más.
            </p>
          </div>
        ) : (
          <>
            {/* Timeline line + cards */}
            <div
              style={{
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
              }}
            >
              {/* Vertical timeline bar */}
              <div
                style={{
                  position: 'absolute',
                  left: '0',
                  top: '0',
                  bottom: '0',
                  width: '2px',
                  background: 'linear-gradient(to bottom, var(--border), transparent)',
                  pointerEvents: 'none',
                }}
              />

              <div style={{ paddingLeft: '0' }}>
                {allEvents.map((event) => {
                  const isRecent = new Date(event.createdAt).getTime() > fiveMinutesAgo;
                  return (
                    <div key={event.id} style={{ marginBottom: '0.5rem' }}>
                      <EventCard event={event} isRecent={isRecent} />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Load more */}
            {hasMore && page < totalPages - 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: '2rem' }}>
                <button
                  className="btn-ghost"
                  onClick={handleLoadMore}
                  disabled={isFetching}
                  style={{ minWidth: '160px' }}
                >
                  {isFetching ? (
                    <span className="loading-text">
                      <span className="spinner" />
                      Cargando...
                    </span>
                  ) : (
                    'Cargar más'
                  )}
                </button>
              </div>
            )}

            {!hasMore && allEvents.length > 0 && (
              <p
                style={{
                  textAlign: 'center',
                  marginTop: '2rem',
                  fontSize: '0.8rem',
                  color: 'var(--text-3)',
                  letterSpacing: '0.04em',
                }}
              >
                — Fin del historial —
              </p>
            )}
          </>
        )}
      </main>
    </div>
  );
}
