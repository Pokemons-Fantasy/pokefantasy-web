import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { getDraftStatus, getClosedList } from '../api/pokemons';
import type { DraftPick, Tier } from '../api/pokemons';
import { getLeagueDetail, getStandings } from '../api/leagues';
import { getActivityFeed } from '../api/activity';
import type { ActivityEvent } from '../api/activity';
import TierBadge from '../components/TierBadge';
import { SkeletonGrid } from '../components/SkeletonGrid';
import UserAvatar from '../components/avatar/UserAvatar';
import { spriteUrl } from '../utils/sprites';
import { CLAUSE_RAISE_MULTIPLIER, victimCoins } from '../utils/clause';
import { useLayoutMode } from '../hooks/useLayoutMode';
import styles from './PlayerProfilePage.module.css';

/** Movimientos de monedas que se ven en móvil antes de "Ver más movimientos". */
const MOBILE_COIN_EVENTS = 5;

function coinDelta(event: ActivityEvent, username: string): number {
  const a = event.coinsAmount ?? 0;
  switch (event.type) {
    case 'COIN_EARNED':    return a;
    case 'COIN_REVOKED':   return -a;
    case 'DRAFT_COINS':    return a;
    case 'BENCH_SWAP':     return a;
    case 'BENCH_PURCHASE': return -a;
    case 'POKEMON_RELEASED': return a;
    case 'STEAL':
      return event.actorUsername === username ? -a : victimCoins(event);
    case 'CLAUSE_RAISED':  return -a;
    case 'TRADE_COMPLETED':
      return event.actorUsername === username ? -a : a;
    default: return 0;
  }
}

function coinEventIcon(event: ActivityEvent, username: string): string {
  switch (event.type) {
    case 'COIN_EARNED':    return '🏆';
    case 'COIN_REVOKED':   return '↩';
    case 'DRAFT_COINS':    return '🎒';
    case 'BENCH_PURCHASE': return '🛒';
    case 'POKEMON_RELEASED': return '🕊️';
    case 'BENCH_SWAP':     return '↔';
    case 'TRADE_COMPLETED': return '🤝';
    case 'CLAUSE_RAISED':  return '🛡';
    case 'STEAL':
      return event.actorUsername === username ? '⚡' : '💰';
    default: return '🪙';
  }
}

function coinEventLabel(event: ActivityEvent, username: string): string {
  const a = event.coinsAmount ?? 0;
  switch (event.type) {
    case 'COIN_EARNED':
      return `+${a} jornada ${event.roundNumber ?? '?'}`;
    case 'COIN_REVOKED':
      return `-${a} jornada ${event.roundNumber ?? '?'} (resultado anulado)`;
    case 'DRAFT_COINS':
      return `+${a} sobrantes del draft`;
    case 'BENCH_PURCHASE':
      return `Compré ${event.pokemonName ?? ''} (-${a})`;
    case 'POKEMON_RELEASED':
      return `Liberé ${event.pokemonName ?? ''} (+${a})`;
    case 'BENCH_SWAP':
      return `Intercambio con el banquillo: ${event.pokemonName ?? ''}↔${event.pokemonName2 ?? ''} (+${a})`;
    case 'TRADE_COMPLETED':
      return event.actorUsername === username
        ? `Intercambio con ${event.targetUsername ?? ''} (-${a})`
        : `Intercambio con ${event.actorUsername} (+${a})`;
    case 'STEAL':
      return event.actorUsername === username
        ? `Robé ${event.pokemonName ?? ''} a ${event.targetUsername ?? ''} (-${a})`
        : `Me robaron ${event.pokemonName ?? ''} (+${victimCoins(event)})`;
    case 'CLAUSE_RAISED':
      return `Subí la cláusula de ${event.pokemonName ?? ''} en ${a * CLAUSE_RAISE_MULTIPLIER} (-${a})`;
    default: return event.type;
  }
}

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'ahora';
  if (m < 60) return `hace ${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `hace ${h}h`;
  return `hace ${Math.floor(h / 24)}d`;
}

export default function PlayerProfilePage() {
  const { leagueId, username } = useParams<{ leagueId: string; username: string }>();

  const { data: standings } = useQuery({
    queryKey: ['standings', leagueId],
    queryFn: () => getStandings(leagueId!),
    enabled: !!leagueId,
    staleTime: 60_000,
  });

  const { data: draft, isLoading: draftLoading } = useQuery({
    queryKey: ['draft-status', leagueId],
    queryFn: () => getDraftStatus(leagueId!),
    enabled: !!leagueId,
    staleTime: 60_000,
  });

  const { data: closedList, isLoading: closedListLoading } = useQuery({
    queryKey: ['closed-list', leagueId],
    queryFn: () => getClosedList(leagueId!),
    enabled: !!leagueId,
    staleTime: 60_000,
  });


  // Ya cargado por LeagueLayout: sale de la caché.
  const { data: league } = useQuery({
    queryKey: ['league-detail', leagueId],
    queryFn: () => getLeagueDetail(leagueId!),
    enabled: !!leagueId,
  });
  const showdownName = league?.members.find((m) => m.username === username)?.showdownName;

  const isLoading = draftLoading || closedListLoading;

  const [coinPage, setCoinPage] = useState(0);
  const { data: coinFeed } = useQuery({
    queryKey: ['coin-history', leagueId, username, coinPage],
    queryFn: () => getActivityFeed(leagueId!, coinPage, { username: username! }),
    staleTime: 60_000,
    enabled: !!leagueId && !!username,
  });

  const coinEvents = (coinFeed?.events ?? []).filter(
    (e) => e.coinsAmount != null && e.coinsAmount > 0 && e.type !== 'MATCH_RESULT' && e.type !== 'TIER_CHANGE'
  );

  // En móvil el historial empieza recortado: con la temporada avanzada no tiene fin
  const mobile = useLayoutMode() === 'mobile';
  const [showAllCoins, setShowAllCoins] = useState(false);
  const collapsed = mobile && !showAllCoins && coinEvents.length > MOBILE_COIN_EVENTS;
  const visibleCoinEvents = collapsed ? coinEvents.slice(0, MOBILE_COIN_EVENTS) : coinEvents;

  const tierByName = useMemo(
    () => new Map<string, Tier | null | undefined>(closedList?.map((e) => [e.pokemonName, e.tier])),
    [closedList]
  );

  const player = standings?.find((s) => s.username === username);
  const currentTeam = draft?.picks.filter((p) => p.username === username) ?? [];
  const draftHistory = draft?.draftHistory?.filter((p) => p.username === username) ?? [];

  // Mostrar historial solo si difiere del equipo actual (tiene pokémon que ya no están)
  const showHistory =
    draftHistory.length > 0 &&
    draftHistory.some((h) => !currentTeam.find((c) => c.pokemonName === h.pokemonName));

  return (
    <>
      <main className="page-content">

        {/* ── Hero del jugador ── */}
        <div className="animate-in" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', marginBottom: '2rem' }}>
          <UserAvatar username={username ?? ''} size={64} className="member-avatar-hero" />
          <div>
            <h1 className="page-title" style={{ marginBottom: '0.15rem' }}>{username}</h1>
            {showdownName && (
              <p style={{ color: 'var(--text-2)', fontSize: '0.9rem' }}>Showdown: {showdownName}</p>
            )}
          </div>
        </div>

        {/* ── Stats ── */}
        {/* En móvil, las cuatro en una fila: las tarjetas ocupaban dos filas */}
        {player && mobile && (
          <ul className={styles.stats} aria-label={`Estadísticas de ${username}`}>
            <li aria-label={`${player.wins} victorias`}>
              <span className={styles.value} style={{ color: 'var(--success)' }}>{player.wins}</span>
              <span className={styles.label} aria-hidden="true">V</span>
            </li>
            <li aria-label={`${player.losses} derrotas`}>
              <span className={styles.value} style={{ color: 'var(--danger)' }}>{player.losses}</span>
              <span className={styles.label} aria-hidden="true">D</span>
            </li>
            <li aria-label={`${player.played} jugados`}>
              <span className={styles.value}>{player.played}</span>
              <span className={styles.label} aria-hidden="true">PJ</span>
            </li>
            <li aria-label={`${player.coins} monedas`}>
              <span className={styles.value} style={{ color: 'var(--accent)' }}>{player.coins}</span>
              <span className={styles.label} aria-hidden="true">Monedas</span>
            </li>
          </ul>
        )}
        {player && !mobile && (
          <div className="stat-pills animate-in" style={{ marginBottom: '2rem' }}>
            <div className="stat-pill">
              <span className="stat-pill-value" style={{ color: 'var(--success)' }}>{player.wins}</span>
              <span className="stat-pill-label">Victorias</span>
            </div>
            <div className="stat-pill">
              <span className="stat-pill-value" style={{ color: 'var(--danger)' }}>{player.losses}</span>
              <span className="stat-pill-label">Derrotas</span>
            </div>
            <div className="stat-pill">
              <span className="stat-pill-value">{player.played}</span>
              <span className="stat-pill-label">Jugados</span>
            </div>
            <div className="stat-pill">
              <span className="stat-pill-value" style={{ color: 'var(--accent)' }}>💰 {player.coins}</span>
              <span className="stat-pill-label">Monedas</span>
            </div>
          </div>
        )}

        {/* ── Equipo actual ── */}
        <div style={{ marginBottom: '2rem' }}>
          <p className="section-label" style={{ marginBottom: '0.75rem' }}>Equipo actual</p>

          {isLoading && <SkeletonGrid count={6} />}

          {!isLoading && currentTeam.length === 0 && (
            <div className="empty-state" style={{ padding: '2rem 1rem' }}>
              <p>Este jugador aún no tiene Pokémon.</p>
            </div>
          )}

          {!isLoading && currentTeam.length > 0 && (
            <div className="pokemon-grid animate-in">
              {currentTeam.map((pick) => (
                <PickCard key={pick.pokemonName} pick={pick} tier={tierByName.get(pick.pokemonName)} />
              ))}
            </div>
          )}
        </div>

        {/* ── Historial del draft (solo si difiere del equipo actual) ── */}
        {!isLoading && showHistory && (
          <div style={{ marginBottom: '2rem' }}>
            <p className="section-label" style={{ marginBottom: '0.75rem' }}>Picks originales del draft</p>
            <div className="pokemon-grid animate-in" style={{ opacity: 0.65 }}>
              {draftHistory.map((pick) => (
                <PickCard key={pick.pokemonName} pick={pick} tier={tierByName.get(pick.pokemonName)} />
              ))}
            </div>
          </div>
        )}

        {/* ── Historial de monedas ── */}
        <div>
          <p className="section-label" style={{ marginBottom: '0.75rem' }}>Monedas</p>

          {coinEvents.length === 0 && coinFeed !== undefined && (
            <div className="empty-state" style={{ padding: '1.5rem 1rem' }}>
              <p style={{ color: 'var(--text-3)', fontSize: '0.9rem' }}>Sin movimientos de monedas aún.</p>
            </div>
          )}

          {coinEvents.length > 0 && (
            <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {visibleCoinEvents.map((event) => {
                const delta = coinDelta(event, username!);
                const positive = delta >= 0;
                return (
                  <div
                    key={event.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.6rem 0.75rem',
                      background: 'var(--surface-2)',
                      borderRadius: '0.5rem',
                    }}
                  >
                    <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>
                      {coinEventIcon(event, username!)}
                    </span>
                    <span style={{ flex: 1, fontSize: '0.85rem', color: 'var(--text-2)' }}>
                      {coinEventLabel(event, username!)}
                    </span>
                    <span
                      style={{
                        fontWeight: 700,
                        fontSize: '0.9rem',
                        color: positive ? 'var(--success)' : 'var(--danger)',
                        flexShrink: 0,
                      }}
                    >
                      {positive ? '+' : ''}{delta} 🪙
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-3)', flexShrink: 0, minWidth: '4rem', textAlign: 'right' }}>
                      {formatRelative(event.createdAt)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {collapsed && (
            <button
              type="button"
              className="btn-secondary"
              style={{ marginTop: '0.75rem', width: '100%' }}
              aria-expanded={false}
              onClick={() => setShowAllCoins(true)}
            >
              Ver más movimientos
            </button>
          )}

          {coinFeed?.hasMore && !collapsed && (
            <button
              className="btn-secondary"
              style={{ marginTop: '0.75rem', width: '100%' }}
              onClick={() => setCoinPage((p) => p + 1)}
            >
              Cargar más
            </button>
          )}
        </div>

      </main>
    </>
  );
}

function PickCard({ pick, tier }: { pick: DraftPick; tier: Tier | null | undefined }) {
  return (
    <div className="pokemon-card">
      <img
        src={spriteUrl(pick.pokemonId)}
        alt={pick.pokemonName}
        className="pokemon-sprite"
        loading="lazy"
      />
      <span className="pokemon-name">{pick.pokemonName}</span>
      <TierBadge tier={tier ?? undefined} />
    </div>
  );
}
