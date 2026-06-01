import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { getDraftStatus, getClosedList } from '../api/pokemons';
import type { DraftPick, Tier } from '../api/pokemons';
import { getStandings, getLeagueDetail } from '../api/leagues';
import PageHeader from '../components/PageHeader';
import TierBadge from '../components/TierBadge';
import { SkeletonGrid } from '../components/SkeletonGrid';
import { spriteUrl } from '../utils/sprites';

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
          <div>
            <p className="section-label" style={{ marginBottom: '0.75rem' }}>Picks originales del draft</p>
            <div className="pokemon-grid animate-in" style={{ opacity: 0.65 }}>
              {draftHistory.map((pick) => (
                <PickCard key={pick.pokemonName} pick={pick} tier={tierByName.get(pick.pokemonName)} />
              ))}
            </div>
          </div>
        )}

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
