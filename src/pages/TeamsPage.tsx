import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import {
  getDraftStatus, getBench, getClosedList, swapWithBench, buyFromBench, stealPokemon, setStealPrice,
} from '../api/pokemons';
import type { BenchEntry, DraftPick, Tier } from '../api/pokemons';
import { getMyCoinBalance, getSchedule, getLeagueSettings } from '../api/leagues';
import TierBadge from '../components/TierBadge';
import { getTrades } from '../api/trades';
import ProposeTradeModal from '../components/ProposeTradeModal';
import TradesModal from '../components/TradesModal';
import { spriteUrl } from '../utils/sprites';
import { priceForTier } from '../utils/tiers';
import BenchActionModal from '../components/teams/BenchActionModal';
import SwapModal from '../components/teams/SwapModal';
import RivalActionModal from '../components/teams/RivalActionModal';
import StealModal from '../components/teams/StealModal';
import SetPriceModal from '../components/teams/SetPriceModal';

// ── Main page ─────────────────────────────────────────────────────────────────

export default function TeamsPage() {
  const { leagueId } = useParams<{ leagueId: string }>();
  const username = useAuthStore((s) => s.username);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [modalBench, setModalBench] = useState<BenchEntry | null>(null);
  const [swapError, setSwapError] = useState('');
  const [buyError, setBuyError] = useState('');
  const [benchGoingToSwap, setBenchGoingToSwap] = useState(false);

  const [rivalModalPick, setRivalModalPick] = useState<{ pick: DraftPick; responder: string } | null>(null);
  const [rivalGoingToSteal, setRivalGoingToSteal] = useState(false);
  const [stealError, setStealError] = useState('');

  const [modalSetPrice, setModalSetPrice] = useState<DraftPick | null>(null);
  const [setPriceError, setSetPriceError] = useState('');

  const [ownTeamCollapsed, setOwnTeamCollapsed] = useState(false);

  const [showTradesModal, setShowTradesModal] = useState(false);
  const [modalProposeTrade, setModalProposeTrade] = useState<{ responder: string; responderPokemon: { name: string; id: number } } | null>(null);

  const [copiedTeam, setCopiedTeam] = useState<string | null>(null);

  // Deep-link: al llegar desde el aviso de intercambios pendientes, abrir el modal.
  const location = useLocation();
  useEffect(() => {
    const navState = location.state as { openTrades?: boolean } | null;
    if (navState?.openTrades) setShowTradesModal(true);
  }, [location.state]);


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

  const { data: trades = [] } = useQuery({
    queryKey: ['trades', leagueId],
    queryFn: () => getTrades(leagueId!),
    enabled: !!leagueId && draft?.status === 'COMPLETED',
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const pendingIncomingCount = trades.filter(
    (t) => t.status === 'PENDING' && t.responder === username
  ).length;

  // El estado de las ventanas lo decide el backend (única fuente de verdad).
  const stealWindowOpen = schedule?.stealWindowOpen ?? false;
  const swapWindowClosed = !(schedule?.swapWindowOpen ?? false);

  // ── Steal helpers ───────────────────────────────────────────────────────────

  function effectiveStealPrice(pick: DraftPick): number {
    if (pick.customStealPrice != null) return pick.customStealPrice;
    const tier = tierByName.get(pick.pokemonName);
    return priceForTier(leagueSettings, tier);
  }

  function isLocked(pick: DraftPick): boolean {
    if (pick.lockedUntilRound == null) return false;
    const jornada = schedule?.jornadas?.find((j) => j.roundNumber === pick.lockedUntilRound);
    return jornada?.matches.some((m) => m.status === 'PENDING') ?? false;
  }

  function exportTeamToShowdown(picks: DraftPick[], teamUsername: string) {
    const text = picks
      .map((p) => p.pokemonName.split('-').map((w) => w[0].toUpperCase() + w.slice(1)).join('-'))
      .join('\n\n');
    navigator.clipboard.writeText(text).then(() => {
      setCopiedTeam(teamUsername);
      setTimeout(() => setCopiedTeam(null), 2000);
    });
  }

  // ── Mutations ───────────────────────────────────────────────────────────────

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

  const { mutate: doSteal, isPending: stealing } = useMutation({
    mutationFn: (targetPokemonName: string) => stealPokemon(leagueId!, targetPokemonName),
    onSuccess: () => {
      setRivalModalPick(null);
      setRivalGoingToSteal(false);
      setStealError('');
      queryClient.invalidateQueries({ queryKey: ['draft-status', leagueId] });
      queryClient.invalidateQueries({ queryKey: ['my-coins', leagueId] });
    },
    onError: (err: Error) => setStealError(err.message ?? 'Error al robar'),
  });

  const { mutate: doSetPrice, isPending: settingPrice } = useMutation({
    mutationFn: ({ pokemonName, newPrice }: { pokemonName: string; newPrice: number }) =>
      setStealPrice(leagueId!, pokemonName, newPrice),
    onSuccess: () => {
      setModalSetPrice(null);
      setSetPriceError('');
      queryClient.invalidateQueries({ queryKey: ['draft-status', leagueId] });
      queryClient.invalidateQueries({ queryKey: ['my-coins', leagueId] });
    },
    onError: (err: Error) => setSetPriceError(err.message ?? 'Error al establecer precio'),
  });

  const { mutate: doBuy, isPending: buying } = useMutation({
    mutationFn: (pokemonName: string) => buyFromBench(leagueId!, pokemonName),
    onSuccess: () => {
      setModalBench(null);
      setBuyError('');
      setBenchGoingToSwap(false);
      queryClient.invalidateQueries({ queryKey: ['draft-status', leagueId] });
      queryClient.invalidateQueries({ queryKey: ['bench', leagueId] });
      queryClient.invalidateQueries({ queryKey: ['my-coins', leagueId] });
    },
    onError: (err: Error) => setBuyError(err.message ?? 'Error al comprar'),
  });

  // ── Data ────────────────────────────────────────────────────────────────────

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
    if (!myTeam) return;
    if (swapWindowClosed) return;
    setSwapError('');
    setBuyError('');
    setBenchGoingToSwap(false);
    setModalBench(entry);
  }

  function renderPicks(team: { username: string; picks: DraftPick[] }, isMe: boolean) {
    if (team.picks.length === 0) {
      return <p style={{ color: 'var(--text-3)', fontSize: '0.875rem' }}>Sin picks aún</p>;
    }
    return (
      <div className="pokemon-grid">
        {team.picks.map((pick) => {
          const locked = isLocked(pick);
          const sp = effectiveStealPrice(pick);
          const canAffordSteal = myBalance >= sp;

          if (isMe) {
            // Own pokemon card
            return (
              <div key={pick.pokemonName} className="pokemon-card" style={{ cursor: 'default', position: 'relative' }}>
                <img
                  src={spriteUrl(pick.pokemonId)}
                  alt={pick.pokemonName}
                  className="pokemon-sprite"
                  loading="lazy"
                />
                <span className="pokemon-name">{pick.pokemonName}</span>
                <TierBadge tier={tierByName.get(pick.pokemonName)} />
                {/* Steal price badge */}
                {stealWindowOpen && (
                  <>
                    <span className="coin-badge" style={{
                      marginTop: '0.25rem',
                      fontSize: '0.68rem',
                      background: 'rgba(251,191,36,0.1)',
                      borderColor: 'rgba(251,191,36,0.25)',
                    }}>
                      🛡 {sp}
                    </span>
                    <button
                      onClick={() => { setSetPriceError(''); setModalSetPrice(pick); }}
                      title="Subir precio de robo"
                      style={{
                        marginTop: '0.2rem',
                        padding: '0.15rem 0.4rem',
                        fontSize: '0.65rem',
                        background: 'rgba(99,102,241,0.15)',
                        border: '1px solid rgba(99,102,241,0.3)',
                        borderRadius: 4,
                        color: '#a5b4fc',
                        cursor: 'pointer',
                      }}
                    >
                      ⬆ precio
                    </button>
                  </>
                )}
              </div>
            );
          } else {
            // Rival pokemon card
            const isTradeable = isDraftCompleted && !locked;
            const isClickable = (stealWindowOpen && !locked) || isTradeable;
            return (
              <div
                key={pick.pokemonName}
                className="pokemon-card"
                style={{
                  cursor: isClickable ? 'pointer' : 'default',
                  opacity: stealWindowOpen && locked ? 0.5 : 1,
                }}
                title={locked ? '🔒 Bloqueado hasta que finalice la jornada' : undefined}
                onClick={() => {
                  if (stealWindowOpen && !locked) {
                    // Modal unificado: el jugador elige robar o proponer trade
                    setRivalModalPick({ pick, responder: team.username });
                  } else if (isTradeable) {
                    // Ventana cerrada: directo a ProposeTradeModal (sin click extra)
                    setModalProposeTrade({
                      responder: team.username,
                      responderPokemon: { name: pick.pokemonName, id: pick.pokemonId },
                    });
                  }
                }}
              >
                <img
                  src={spriteUrl(pick.pokemonId)}
                  alt={pick.pokemonName}
                  className="pokemon-sprite"
                  loading="lazy"
                />
                <span className="pokemon-name">{pick.pokemonName}</span>
                <TierBadge tier={tierByName.get(pick.pokemonName)} />
                {stealWindowOpen && (
                  locked ? (
                    <span style={{ marginTop: '0.25rem', fontSize: '0.75rem' }}>🔒</span>
                  ) : (
                    <>
                      <span className="coin-badge" style={{
                        marginTop: '0.25rem',
                        fontSize: '0.68rem',
                        background: canAffordSteal ? 'rgba(239,68,68,0.1)' : 'rgba(107,114,128,0.15)',
                        borderColor: canAffordSteal ? 'rgba(239,68,68,0.3)' : 'rgba(107,114,128,0.25)',
                        color: canAffordSteal ? '#f87171' : '#9ca3af',
                      }}>
                        💰 {sp}
                      </span>
                      {!canAffordSteal && (
                        <span style={{ marginTop: '0.15rem', fontSize: '0.65rem', color: 'var(--text-3)' }}>
                          ⇄ proponer
                        </span>
                      )}
                    </>
                  )
                )}
                {!stealWindowOpen && isDraftCompleted && !locked && (
                  <span style={{
                    marginTop: '0.25rem',
                    fontSize: '0.65rem',
                    color: 'var(--text-3)',
                  }}>
                    ⇄ proponer
                  </span>
                )}
              </div>
            );
          }
        })}
      </div>
    );
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
            {isDraftCompleted && (
              <button
                className="btn-ghost"
                style={{ position: 'relative' }}
                onClick={() => setShowTradesModal(true)}
              >
                Intercambios
                {pendingIncomingCount > 0 && (
                  <span
                    style={{
                      position: 'absolute',
                      top: -6,
                      right: -6,
                      background: 'var(--accent)',
                      color: '#fff',
                      fontSize: '0.65rem',
                      fontWeight: 700,
                      borderRadius: '50%',
                      width: 18,
                      height: 18,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {pendingIncomingCount}
                  </span>
                )}
              </button>
            )}
            <button className="btn-ghost" onClick={logout}>Cerrar sesión</button>
          </div>
        </div>
      </header>

      {/* Bench action modal — choose swap or buy */}
      {modalBench && myTeam && !benchGoingToSwap && (
        <BenchActionModal
          benchEntry={modalBench}
          myPicks={myTeam.picks}
          myBalance={myBalance}
          tierByName={tierByName}
          buying={buying}
          buyError={buyError}
          onChooseSwap={() => setBenchGoingToSwap(true)}
          onBuyConfirm={() => doBuy(modalBench.pokemonName)}
          onClose={() => { setModalBench(null); setBuyError(''); setBenchGoingToSwap(false); }}
        />
      )}

      {/* Swap modal — shown after choosing Intercambiar */}
      {modalBench && myTeam && benchGoingToSwap && (
        <SwapModal
          benchEntry={modalBench}
          myPicks={myTeam.picks}
          myBalance={myBalance}
          tierByName={tierByName}
          leagueSettings={leagueSettings}
          swapping={swapping}
          error={swapError}
          onConfirm={(give) => doSwap({ give, take: modalBench.pokemonName })}
          onClose={() => { setModalBench(null); setSwapError(''); setBenchGoingToSwap(false); }}
          onBack={() => { setSwapError(''); setBenchGoingToSwap(false); }}
        />
      )}

      {/* Rival action modal — choose steal or propose trade */}
      {rivalModalPick && !rivalGoingToSteal && (
        <RivalActionModal
          pick={rivalModalPick.pick}
          responder={rivalModalPick.responder}
          stealPrice={effectiveStealPrice(rivalModalPick.pick)}
          myBalance={myBalance}
          tierByName={tierByName}
          onChooseSteal={() => setRivalGoingToSteal(true)}
          onChooseTrade={() => {
            setModalProposeTrade({
              responder: rivalModalPick.responder,
              responderPokemon: { name: rivalModalPick.pick.pokemonName, id: rivalModalPick.pick.pokemonId },
            });
            setRivalModalPick(null);
          }}
          onClose={() => setRivalModalPick(null)}
        />
      )}

      {/* Steal modal — shown after choosing Robar in RivalActionModal */}
      {rivalModalPick && rivalGoingToSteal && (
        <StealModal
          pick={rivalModalPick.pick}
          stealPrice={effectiveStealPrice(rivalModalPick.pick)}
          myBalance={myBalance}
          tierByName={tierByName}
          stealing={stealing}
          error={stealError}
          onConfirm={() => doSteal(rivalModalPick.pick.pokemonName)}
          onClose={() => { setRivalModalPick(null); setStealError(''); setRivalGoingToSteal(false); }}
          onBack={() => { setStealError(''); setRivalGoingToSteal(false); }}
        />
      )}

      {/* Set price modal */}
      {modalSetPrice && (
        <SetPriceModal
          pick={modalSetPrice}
          currentPrice={effectiveStealPrice(modalSetPrice)}
          myBalance={myBalance}
          tierByName={tierByName}
          saving={settingPrice}
          error={setPriceError}
          onConfirm={(newPrice) => doSetPrice({ pokemonName: modalSetPrice.pokemonName, newPrice })}
          onClose={() => { setModalSetPrice(null); setSetPriceError(''); }}
        />
      )}

      {/* Trades inbox modal */}
      {showTradesModal && (
        <TradesModal
          leagueId={leagueId!}
          currentUsername={username!}
          onClose={() => setShowTradesModal(false)}
        />
      )}

      {/* Propose trade modal */}
      {modalProposeTrade && myTeam && (
        <ProposeTradeModal
          leagueId={leagueId!}
          responder={modalProposeTrade.responder}
          responderPokemon={modalProposeTrade.responderPokemon}
          myTeam={myTeam.picks.map((p) => ({ name: p.pokemonName, id: p.pokemonId }))}
          onClose={() => setModalProposeTrade(null)}
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

        {swapWindowClosed ? (
          <div className="my-turn-banner" style={{
            background: 'rgba(248,113,113,0.07)',
            borderColor: 'rgba(248,113,113,0.25)',
            color: '#f87171',
            marginBottom: '0.75rem',
          }}>
            🔒 Intercambios cerrados hasta que se registren todos los resultados de la jornada
          </div>
        ) : (
          <div className="my-turn-banner" style={{
            background: 'rgba(251,191,36,0.07)',
            borderColor: 'rgba(251,191,36,0.25)',
            color: '#fbbf24',
            marginBottom: '0.75rem',
          }}>
            🔓 Ventana de intercambios abierta — cierra el viernes a las 16:00
          </div>
        )}

        {stealWindowOpen ? (
          <div className="my-turn-banner" style={{
            background: 'rgba(251,191,36,0.07)',
            borderColor: 'rgba(251,191,36,0.25)',
            color: '#fbbf24',
            marginBottom: '0.75rem',
          }}>
            🔓 Ventana de robos abierta — cierra el jueves a las 23:59
          </div>
        ) : (
          <div className="my-turn-banner" style={{
            background: 'rgba(248,113,113,0.07)',
            borderColor: 'rgba(248,113,113,0.25)',
            color: '#f87171',
            marginBottom: '0.75rem',
          }}>
            🔒 Robos cerrados — la ventana abre el jueves de la semana de la jornada
          </div>
        )}

        {draft && teams.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem', marginTop: '1.5rem' }}>
            {myTeam && (
              <div className="own-team-panel">
                <div className="own-team-panel-header">
                  <div className="member-avatar">{myTeam.username[0]}</div>
                  <span style={{ fontWeight: 600, fontSize: '1rem' }}>Tu equipo</span>
                  <span style={{ color: 'var(--text-3)', fontSize: '0.85rem' }}>
                    {myTeam.picks.length}/{maxTeamSize}
                  </span>
                  <span className="badge badge-green">Tú</span>
                  {myCoins !== undefined && (
                    <span className="coin-badge">💰 {myCoins.coins}</span>
                  )}
                  {isDraftCompleted && myTeam.picks.length > 0 && (
                    <button
                      className="btn-ghost"
                      style={{ fontSize: '0.78rem', padding: '0.2rem 0.55rem' }}
                      onClick={() => exportTeamToShowdown(myTeam.picks, myTeam.username)}
                      title="Copiar equipo en formato Pokémon Showdown"
                    >
                      {copiedTeam === myTeam.username ? '✓ Copiado' : '📋 Showdown'}
                    </button>
                  )}
                  <button
                    className="btn-ghost own-team-collapse-btn"
                    onClick={() => setOwnTeamCollapsed((c) => !c)}
                  >
                    {ownTeamCollapsed ? '▶ Mostrar' : '▼ Ocultar'}
                  </button>
                </div>
                {!ownTeamCollapsed && (
                  <div className="own-team-panel-grid">{renderPicks(myTeam, true)}</div>
                )}
              </div>
            )}

            {teams.filter((team) => team.username !== username).map((team) => (
              <div key={team.username}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <div className="member-avatar">{team.username[0]}</div>
                  <span style={{ fontWeight: 600, fontSize: '1rem' }}>{team.username}</span>
                  <span style={{ color: 'var(--text-3)', fontSize: '0.85rem' }}>
                    {team.picks.length}/{maxTeamSize}
                  </span>
                  {isDraftCompleted && team.picks.length > 0 && (
                    <button
                      className="btn-ghost"
                      style={{ fontSize: '0.78rem', padding: '0.2rem 0.55rem', marginLeft: 'auto' }}
                      onClick={() => exportTeamToShowdown(team.picks, team.username)}
                      title="Copiar equipo en formato Pokémon Showdown"
                    >
                      {copiedTeam === team.username ? '✓ Copiado' : '📋 Showdown'}
                    </button>
                  )}
                </div>
                {renderPicks(team, false)}
              </div>
            ))}
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
                {!swapWindowClosed && myTeam && (
                  <p style={{ color: 'var(--text-2)', fontSize: '0.875rem', marginBottom: '1rem' }}>
                    Haz click en un pokémon de la banca para intercambiarlo o comprarlo.
                  </p>
                )}
                <div className="pokemon-grid">
                  {bench.map((entry) => {
                    const price = entry.price ?? 0;
                    const canAfford = price === 0 || myBalance >= price;
                    const isClickable = !swapWindowClosed && !!myTeam;
                    const tier = (entry.tier as Tier | undefined) ?? tierByName.get(entry.pokemonName);

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
                            : isClickable
                            ? 'Intercambiar o comprar'
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
