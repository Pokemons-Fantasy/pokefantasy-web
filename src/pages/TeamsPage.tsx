import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { getDraftStatus, getBench, getClosedList, swapWithBench } from '../api/pokemons';
import type { BenchEntry, DraftPick } from '../api/pokemons';
import { getMyCoinBalance, getSchedule, getLeagueSettings } from '../api/leagues';
import TierBadge from '../components/TierBadge';

function spriteUrl(pokemonId: number) {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemonId}.png`;
}

// ── Swap Modal ────────────────────────────────────────────────────────────────

interface SwapModalProps {
  benchEntry: BenchEntry;
  myPicks: DraftPick[];
  myBalance: number;
  tierByName: Map<string, string | undefined>;
  swapping: boolean;
  error: string;
  onConfirm: (give: string) => void;
  onClose: () => void;
}

function SwapModal({
  benchEntry, myPicks, myBalance, tierByName, swapping, error, onConfirm, onClose,
}: SwapModalProps) {
  const [giveTarget, setGiveTarget] = useState<string | null>(null);
  const price = benchEntry.price ?? 0;
  const canAfford = price === 0 || myBalance >= price;
  const tier = benchEntry.tier ?? tierByName.get(benchEntry.pokemonName);

  return (
    <div
      className="modal-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal animate-in-fast" style={{ maxWidth: 520 }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '1.15rem' }}>Intercambio de banca</h2>
          <button
            className="btn-ghost"
            style={{ padding: '0.2rem 0.55rem', fontSize: '1rem', lineHeight: 1 }}
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        {/* Incoming pokemon */}
        <div style={{
          background: 'var(--surface-2)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          padding: '1rem 1.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1.25rem',
        }}>
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <img
              src={spriteUrl(benchEntry.pokemonId)}
              alt={benchEntry.pokemonName}
              style={{ width: 80, height: 80, imageRendering: 'pixelated', display: 'block' }}
            />
            <TierBadge tier={tier} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: '1.05rem', textTransform: 'capitalize', marginBottom: '0.35rem' }}>
              {benchEntry.pokemonName}
            </div>
            {tier && (
              <div style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginBottom: '0.45rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Tier {tier}
              </div>
            )}
            {price > 0 ? (
              <span className="coin-badge coin-badge-lg">💰 {price} monedas</span>
            ) : (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                color: 'var(--green)', fontSize: '0.85rem', fontWeight: 600,
              }}>
                ✓ Gratis
              </span>
            )}
          </div>
        </div>

        {/* Balance row (only shown when there's a cost) */}
        {price > 0 && (
          <div style={{
            background: canAfford ? 'rgba(52,211,153,0.05)' : 'rgba(248,113,113,0.05)',
            border: `1px solid ${canAfford ? 'rgba(52,211,153,0.18)' : 'rgba(248,113,113,0.18)'}`,
            borderRadius: 10,
            padding: '0.75rem 1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.75rem',
            flexWrap: 'wrap',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-2)' }}>Tu saldo</span>
              <span className="coin-badge" style={!canAfford ? {
                background: 'rgba(107,114,128,0.15)',
                borderColor: 'rgba(107,114,128,0.25)',
                color: '#9ca3af',
              } : {}}>
                💰 {myBalance}
              </span>
            </div>
            {canAfford ? (
              <span style={{ fontSize: '0.8rem', color: 'var(--green)', fontWeight: 600 }}>
                ✓ Saldo suficiente
              </span>
            ) : (
              <span style={{ fontSize: '0.8rem', color: 'var(--red)', fontWeight: 600 }}>
                Te faltan {price - myBalance} monedas
              </span>
            )}
          </div>
        )}

        {/* Can't afford — stop here */}
        {!canAfford && (
          <p style={{ fontSize: '0.875rem', color: 'var(--text-2)', textAlign: 'center', padding: '0.5rem 0' }}>
            Necesitas <strong style={{ color: 'var(--accent)' }}>💰 {price}</strong> para fichar a este pokémon.
          </p>
        )}

        {/* Team pokemon selection */}
        {canAfford && myPicks.length > 0 && (
          <>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-2)', fontWeight: 500, marginBottom: '0.25rem' }}>
              ¿Qué pokémon de tu equipo entregas?
            </p>
            <div
              className="pokemon-grid"
              style={{ maxHeight: 260, overflowY: 'auto', paddingRight: '0.25rem' }}
            >
              {myPicks.map((pick) => {
                const isChosen = giveTarget === pick.pokemonName;
                return (
                  <div
                    key={pick.pokemonName}
                    className="pokemon-card"
                    style={{
                      cursor: 'pointer',
                      border: isChosen ? '1px solid var(--accent)' : undefined,
                      background: isChosen ? 'var(--accent-dim)' : undefined,
                      transform: isChosen ? 'translateY(-2px)' : undefined,
                      boxShadow: isChosen ? '0 0 14px var(--accent-glow)' : undefined,
                    }}
                    onClick={() => setGiveTarget(isChosen ? null : pick.pokemonName)}
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
                );
              })}
            </div>
          </>
        )}

        {error && <p className="error">{error}</p>}

        <div className="modal-actions">
          <button className="btn-ghost" onClick={onClose} disabled={swapping}>
            Cancelar
          </button>
          {canAfford && (
            <button
              className="btn-primary"
              disabled={!giveTarget || swapping}
              onClick={() => giveTarget && onConfirm(giveTarget)}
            >
              {swapping ? 'Intercambiando…' : 'Confirmar intercambio'}
            </button>
          )}
        </div>

      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function TeamsPage() {
  const { leagueId } = useParams<{ leagueId: string }>();
  const username = useAuthStore((s) => s.username);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [modalBench, setModalBench] = useState<BenchEntry | null>(null);
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

  const activeJornada = schedule?.jornadas?.find(
    (j) => j.matches.some((m) => m.status === 'PENDING'),
  );
  const swapWindowClosed = (() => {
    if (!activeJornada?.swapDeadline) return false;
    return new Date() >= new Date(activeJornada.swapDeadline);
  })();

  const { mutate: doSwap, isPending: swapping } = useMutation({
    mutationFn: ({ give, take }: { give: string; take: string }) =>
      swapWithBench(leagueId!, give, take),
    onSuccess: () => {
      setModalBench(null);
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
  const myBalance = myCoins?.coins ?? 0;

  function handleBenchCardClick(entry: BenchEntry) {
    if (!isDraftCompleted) return;
    if (!myTeam || myTeam.picks.length === 0) return;
    if (swapWindowClosed) return;
    setSwapError('');
    setModalBench(entry);
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

      {/* Swap confirmation modal */}
      {modalBench && myTeam && (
        <SwapModal
          benchEntry={modalBench}
          myPicks={myTeam.picks}
          myBalance={myBalance}
          tierByName={tierByName}
          swapping={swapping}
          error={swapError}
          onConfirm={(give) => doSwap({ give, take: modalBench.pokemonName })}
          onClose={() => { setModalBench(null); setSwapError(''); }}
        />
      )}

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

        {draft && teams.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem', marginTop: '1.5rem' }}>
            {teams.map((team) => {
              const isMe = team.username === username;
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
                  </div>

                  {team.picks.length === 0 ? (
                    <p style={{ color: 'var(--text-3)', fontSize: '0.875rem' }}>Sin picks aún</p>
                  ) : (
                    <div className="pokemon-grid">
                      {team.picks.map((pick) => (
                        <div key={pick.pokemonName} className="pokemon-card" style={{ cursor: 'default' }}>
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

        {/* ── Bench ── */}
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
                {!swapWindowClosed && myTeam && myTeam.picks.length > 0 && (
                  <p style={{ color: 'var(--text-2)', fontSize: '0.875rem', marginBottom: '1rem' }}>
                    Haz click en un pokémon de la banca para ver el precio e intercambiarlo.
                  </p>
                )}
                <div className="pokemon-grid">
                  {bench.map((entry) => {
                    const price = entry.price ?? 0;
                    const canAfford = price === 0 || myBalance >= price;
                    const isClickable = !swapWindowClosed && !!(myTeam && myTeam.picks.length > 0);
                    const tier = entry.tier ?? tierByName.get(entry.pokemonName);

                    return (
                      <div
                        key={entry.pokemonName}
                        className="pokemon-card"
                        style={{
                          cursor: isClickable ? 'pointer' : 'default',
                          opacity: isClickable && !canAfford ? 0.5 : 1,
                        }}
                        title={
                          swapWindowClosed
                            ? 'Intercambios cerrados'
                            : !canAfford
                            ? `Sin monedas (necesitas ${price})`
                            : undefined
                        }
                        onClick={() => isClickable && handleBenchCardClick(entry)}
                      >
                        <img
                          src={spriteUrl(entry.pokemonId)}
                          alt={entry.pokemonName}
                          className="pokemon-sprite"
                          loading="lazy"
                        />
                        <span className="pokemon-name">{entry.pokemonName}</span>
                        <TierBadge tier={tier} />

                        {/* Price badge — always visible */}
                        {price > 0 ? (
                          <span
                            className="coin-badge"
                            style={{
                              marginTop: '0.3rem',
                              fontSize: '0.7rem',
                              background: canAfford
                                ? 'rgba(251,191,36,0.12)'
                                : 'rgba(107,114,128,0.15)',
                              borderColor: canAfford
                                ? 'rgba(251,191,36,0.3)'
                                : 'rgba(107,114,128,0.25)',
                              color: canAfford ? 'var(--accent)' : '#9ca3af',
                            }}
                          >
                            💰 {price}
                          </span>
                        ) : (
                          <span style={{
                            marginTop: '0.3rem',
                            fontSize: '0.68rem',
                            color: 'var(--green)',
                            fontWeight: 600,
                          }}>
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
