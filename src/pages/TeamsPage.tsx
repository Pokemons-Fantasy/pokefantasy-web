import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { getDraftStatus, getBench, getClosedList, swapWithBench } from '../api/pokemons';
import type { BenchEntry } from '../api/pokemons';
import { getMyCoinBalance, getSchedule, getLeagueSettings } from '../api/leagues';
import TierBadge from '../components/TierBadge';

function spriteUrl(pokemonId: number) {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemonId}.png`;
}

export default function TeamsPage() {
  const { leagueId } = useParams<{ leagueId: string }>();
  const username = useAuthStore((s) => s.username);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [selectedBench, setSelectedBench] = useState<BenchEntry | null>(null);
  const [swapError, setSwapError] = useState('');

  const { data: draft, isLoading } = useQuery({
    queryKey: ['draft-status', leagueId],
    queryFn: () => getDraftStatus(leagueId!),
    enabled: !!leagueId,
    staleTime: 30_000,
  });

  const { data: bench = [] } = useQuery({
    queryKey: ['bench', leagueId],
    queryFn: () => getBench(leagueId!),
    enabled: !!leagueId && draft?.status === 'COMPLETED',
    staleTime: 30_000,
  });

  const { data: closedList = [] } = useQuery({
    queryKey: ['closed-list', leagueId],
    queryFn: () => getClosedList(leagueId!),
    enabled: !!leagueId,
    staleTime: 30_000,
  });
  const tierByName = new Map(closedList.map((e) => [e.pokemonName, e.tier]));

  const { data: myCoins } = useQuery({
    queryKey: ['my-coins', leagueId],
    queryFn: () => getMyCoinBalance(leagueId!),
    enabled: !!leagueId && draft?.status === 'COMPLETED',
    staleTime: 30_000,
  });

  const { data: leagueSettings } = useQuery({
    queryKey: ['league-settings', leagueId],
    queryFn: () => getLeagueSettings(leagueId!),
    enabled: !!leagueId,
    staleTime: 120_000,
  });

  const maxTeamSize = leagueSettings?.maxTeamSize ?? 10;

  const { data: schedule } = useQuery({
    queryKey: ['schedule', leagueId],
    queryFn: () => getSchedule(leagueId!),
    enabled: !!leagueId && draft?.status === 'COMPLETED',
    staleTime: 60_000,
  });

  // Derive swap window status from schedule client-side
  const activeJornada = schedule?.jornadas?.find(
    (j) => j.matches.some((m) => m.status === 'PENDING')
  );
  const swapWindowClosed = (() => {
    if (!activeJornada?.swapDeadline) return false; // no dates = no restriction
    return new Date() >= new Date(activeJornada.swapDeadline);
  })();

  const { mutate: doSwap, isPending: swapping } = useMutation({
    mutationFn: ({ give, take }: { give: string; take: string }) =>
      swapWithBench(leagueId!, give, take),
    onSuccess: () => {
      setSelectedBench(null);
      setSwapError('');
      queryClient.invalidateQueries({ queryKey: ['draft-status', leagueId] });
      queryClient.invalidateQueries({ queryKey: ['bench', leagueId] });
      queryClient.invalidateQueries({ queryKey: ['my-coins', leagueId] });
    },
    onError: (err: Error) => setSwapError(err.message ?? 'Error al intercambiar'),
  });

  const teams = draft
    ? draft.turnOrder.map((player) => ({
        username: player,
        picks: (draft.picks ?? [])
          .filter((p) => p.username === player)
          .sort((a, b) => a.pokemonId - b.pokemonId),
      }))
    : [];

  const myTeam = teams.find((t) => t.username === username);
  const isDraftCompleted = draft?.status === 'COMPLETED';

  function handleBenchClick(entry: BenchEntry) {
    if (!isDraftCompleted) return;
    setSwapError('');
    setSelectedBench((prev) => (prev?.pokemonName === entry.pokemonName ? null : entry));
  }

  function handleMyPokemonClick(pokemonName: string) {
    if (!selectedBench || swapping) return;
    doSwap({ give: pokemonName, take: selectedBench.pokemonName });
  }

  return (
    <div className="page-wrapper">
      <header className="page-header">
        <div className="page-header-inner">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button className="btn-back" onClick={() => navigate(`/leagues/${leagueId}/draft`)}>
              ← Draft
            </button>
            <span className="logo" onClick={() => navigate('/leagues')}>PokeFantasy</span>
          </div>
          <div className="header-right">
            <span className="header-user">Hola, <strong>{username}</strong></span>
            <button className="btn-ghost" onClick={logout}>Cerrar sesión</button>
          </div>
        </div>
      </header>

      <main className="page-content">
        <h1 className="page-title">Equipos</h1>

        {isLoading && <p style={{ color: 'var(--text-3)' }}>Cargando...</p>}

        {!isLoading && !draft && (
          <div className="empty-state">
            <p>No hay draft en esta liga.</p>
          </div>
        )}

        {swapWindowClosed && (
          <div className="my-turn-banner" style={{
            background: 'rgba(248,113,113,0.07)',
            borderColor: 'rgba(248,113,113,0.25)',
            color: '#f87171',
            marginBottom: '0.75rem',
          }}>
            🔒 Intercambios cerrados hasta que se registren todos los resultados de la jornada
          </div>
        )}

        {selectedBench && (
          <div className="my-turn-banner" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>
              Intercambiando <strong style={{ textTransform: 'capitalize' }}>{selectedBench.pokemonName}</strong> — elige el pokémon de tu equipo que quieres dar
            </span>
            <button
              className="btn-ghost"
              style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem' }}
              onClick={() => { setSelectedBench(null); setSwapError(''); }}
            >
              Cancelar
            </button>
          </div>
        )}

        {swapWindowClosed && (
          <div className="swap-closed-banner" style={{ marginBottom: '1rem' }}>
            🔒 El plazo de intercambio con la banca está cerrado (hasta el viernes 16:00).
          </div>
        )}

        {swapError && <p className="error" style={{ marginBottom: '1rem' }}>{swapError}</p>}

        {draft && teams.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem', marginTop: '1.5rem' }}>
            {teams.map((team) => {
              const isMe = team.username === username;
              const selectableMode = !!selectedBench && isMe;

              return (
                <div key={team.username}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                    <div className="member-avatar">{team.username[0]}</div>
                    <span style={{ fontWeight: 600, fontSize: '1rem' }}>{team.username}</span>
                    <span style={{ color: 'var(--text-3)', fontSize: '0.85rem' }}>
                      {team.picks.length}/{maxTeamSize}
                    </span>
                    {isMe && <span className="badge badge-green">Tú</span>}
                    {isMe && myCoins !== undefined && (
                      <span className="coin-badge">💰 {myCoins.coins}</span>
                    )}
                    {selectableMode && (
                      <span style={{ color: 'var(--accent)', fontSize: '0.8rem' }}>
                        ← elige cuál das
                      </span>
                    )}
                  </div>

                  {team.picks.length === 0 ? (
                    <p style={{ color: 'var(--text-3)', fontSize: '0.875rem' }}>Sin picks aún</p>
                  ) : (
                    <div className="pokemon-grid">
                      {team.picks.map((pick) => (
                        <div
                          key={pick.pokemonName}
                          className={`pokemon-card${selectableMode ? ' nominated' : ''}`}
                          style={selectableMode ? { cursor: 'pointer' } : undefined}
                          onClick={() => selectableMode && handleMyPokemonClick(pick.pokemonName)}
                        >
                          <img
                            src={spriteUrl(pick.pokemonId)}
                            alt={pick.pokemonName}
                            className="pokemon-sprite"
                            loading="lazy"
                          />
                          <span className="pokemon-name">{pick.pokemonName}</span>
                          <TierBadge tier={tierByName.get(pick.pokemonName)} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {isDraftCompleted && (
          <div style={{ marginTop: '3rem' }}>
            <hr className="divider" />
            <p className="section-label">Banca</p>
            {bench.length === 0 ? (
              <p style={{ color: 'var(--text-3)', fontSize: '0.875rem' }}>
                No quedan pokémons en la banca.
              </p>
            ) : (
              <>
                {myTeam && myTeam.picks.length > 0 && (
                  <p style={{ color: 'var(--text-2)', fontSize: '0.875rem', marginBottom: '1rem' }}>
                    Haz click en un pokémon de la banca para intercambiarlo con uno de tu equipo.
                  </p>
                )}
                <div className="pokemon-grid">
                  {bench.map((entry) => {
                    const isSelected = selectedBench?.pokemonName === entry.pokemonName;
                    const price = entry.price ?? 0;
                    const canAfford = price === 0 || (myCoins !== undefined && myCoins.coins >= price);
                    const canSwap = !!(myTeam && myTeam.picks.length > 0) && canAfford && !swapWindowClosed;
                    return (
                      <div
                        key={entry.pokemonName}
                        className={`pokemon-card${isSelected ? ' nominated' : ''}${!canAfford ? ' locked' : ''}`}
                        style={{
                          cursor: canSwap ? 'pointer' : 'default',
                          opacity: !canAfford ? 0.45 : 1,
                        }}
                        title={!canAfford ? `Sin monedas (necesitas ${price})` : undefined}
                        onClick={() => canSwap && handleBenchClick(entry)}
                      >
                        <img
                          src={spriteUrl(entry.pokemonId)}
                          alt={entry.pokemonName}
                          className="pokemon-sprite"
                          loading="lazy"
                        />
                        <span className="pokemon-name">{entry.pokemonName}</span>
                        <TierBadge tier={entry.tier ?? tierByName.get(entry.pokemonName)} />
                        {price > 0 ? (
                          <span
                            className="coin-badge"
                            style={{ marginTop: '0.25rem', fontSize: '0.75rem', background: canAfford ? 'var(--accent)' : '#6b7280' }}
                          >
                            💰 {price}
                          </span>
                        ) : (
                          <span style={{ marginTop: '0.25rem', fontSize: '0.7rem', color: 'var(--text-2)' }}>
                            Gratis
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
