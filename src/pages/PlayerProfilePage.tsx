import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { getDraftStatus, getClosedList } from '../api/pokemons';
import type { DraftPick, Tier } from '../api/pokemons';
import { getStandings, getLeagueDetail } from '../api/leagues';
import { getActivityFeed } from '../api/activity';
import type { ActivityEvent } from '../api/activity';
import PageHeader from '../components/PageHeader';
import TierBadge from '../components/TierBadge';
import { SkeletonGrid } from '../components/SkeletonGrid';
import { spriteUrl } from '../utils/sprites';

function coinDelta(event: ActivityEvent, username: string): number {
  const a = event.coinsAmount ?? 0;
  switch (event.type) {
    case 'COIN_EARNED':    return a;
    case 'BENCH_SWAP':     return a;
    case 'BENCH_PURCHASE': return -a;
    case 'STEAL':
      return event.actorUsername === username ? -a : 2 * a;
    case 'TRADE_COMPLETED':
      return event.actorUsername === username ? -a : a;
    default: return 0;
  }
}

function coinEventIcon(event: ActivityEvent, username: string): string {
  switch (event.type) {
    case 'COIN_EARNED':    return '🏆';
    case 'BENCH_PURCHASE': return '🛒';
    case 'BENCH_SWAP':     return '↔';
    case 'TRADE_COMPLETED': return '🤝';
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
    case 'BENCH_PURCHASE':
      return `Compré ${event.pokemonName ?? ''} (-${a})`;
    case 'BENCH_SWAP':
      return `Swap: ${event.pokemonName ?? ''}↔${event.pokemonName2 ?? ''} (+${a})`;
    case 'TRADE_COMPLETED':
      return event.actorUsername === username
        ? `Trade con ${event.targetUsername ?? ''} (-${a})`
        : `Trade con ${event.actorUsername} (+${a})`;
    case 'STEAL':
      return event.actorUsername === username
        ? `Robé ${event.pokemonName ?? ''} a ${event.targetUsername ?? ''} (-${a})`
        : `Me robaron ${event.pokemonName ?? ''} (+${2 * a})`;
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
  const navigate = useNavigate();

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

  const { data: league } = useQuery({
    queryKey: ['league-detail', leagueId],
    queryFn: () => getLeagueDetail(leagueId!),
    enabled: !!leagueId,
    staleTime: 60_000,
  });

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
    <div className="page-wrapper">
      <PageHeader left={
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button className="btn-back" onClick={() => navigate(`/leagues/${leagueId}`)}>← Liga</button>
          <span className="logo" onClick={() => navigate('/leagues')}>PokeFantasy</span>
        </div>
      } />

      <main className="page-content">

        {/* ── Hero del jugador ── */}
        <div className="animate-in" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', marginBottom: '2rem' }}>
          <div style={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            background: 'var(--accent-dim)',
            border: '2px solid var(--accent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.75rem',
            fontWeight: 800,
            color: 'var(--accent)',
            flexShrink: 0,
          }}>
            {username?.[0]?.toUpperCase()}
          </div>
          <div>
            <h1 className="page-title" style={{ marginBottom: '0.15rem' }}>{username}</h1>
            {league && <p className="page-subtitle">{league.name}</p>}
          </div>
        </div>

        {/* ── Stats ── */}
        {player && (
          <div className="stat-pills animate-in" style={{ marginBottom: '2rem' }}>
            <div className="stat-pill">
              <span className="stat-pill-value" style={{ color: 'var(--green)' }}>{player.wins}</span>
              <span className="stat-pill-label">Victorias</span>
            </div>
            <div className="stat-pill">
              <span className="stat-pill-value" style={{ color: 'var(--red)' }}>{player.losses}</span>
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
              <p>Este jugador aún no tiene pokémon.</p>
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
              {coinEvents.map((event) => {
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
                        color: positive ? 'var(--green)' : 'var(--red)',
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

          {coinFeed?.hasMore && (
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
    </div>
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
