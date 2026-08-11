import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { Clipboard } from '@capacitor/clipboard';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { useAuthStore } from '../store/authStore';
import {
  getDraftStatus, getBench, getClosedList, swapWithBench, buyFromBench, stealPokemon, setStealPrice, releasePokemon,
} from '../api/pokemons';
import type { BenchEntry, ClosedListEntry, DraftPick, Tier } from '../api/pokemons';
import PokemonDetailModal from '../components/PokemonDetailModal';
import { SkeletonGrid } from '../components/SkeletonGrid';
import { getMyCoinBalance, getSchedule, getLeagueSettings } from '../api/leagues';
import { getTrades } from '../api/trades';
import ProposeTradeModal from '../components/ProposeTradeModal';
import TradesModal from '../components/TradesModal';
import { priceForTier } from '../utils/tiers';
import { deriveTeams } from '../utils/teams';
import BenchActionModal from '../components/teams/BenchActionModal';
import SwapModal from '../components/teams/SwapModal';
import RivalActionModal from '../components/teams/RivalActionModal';
import StealModal from '../components/teams/StealModal';
import SetPriceModal from '../components/teams/SetPriceModal';
import ReleaseModal from '../components/teams/ReleaseModal';
import OwnTeamPanel from '../components/teams/OwnTeamPanel';
import RivalTeamsList from '../components/teams/RivalTeamsList';
import TeamFilterBar from '../components/teams/TeamFilterBar';
import BenchSection from '../components/teams/BenchSection';
import { useToastStore } from '../store/toastStore';
import { extractErrorMessage } from '../utils/errorMessage';
import PageHeader from '../components/PageHeader';

// ── Main page ─────────────────────────────────────────────────────────────────

export default function TeamsPage() {
  const { leagueId } = useParams<{ leagueId: string }>();
  const username = useAuthStore((s) => s.username);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const addToast = useToastStore((s) => s.addToast);

  const [modalBench, setModalBench] = useState<BenchEntry | null>(null);
  const [benchGoingToSwap, setBenchGoingToSwap] = useState(false);

  const [rivalModalPick, setRivalModalPick] = useState<{ pick: DraftPick; responder: string } | null>(null);
  const [rivalGoingToSteal, setRivalGoingToSteal] = useState(false);

  const [modalSetPrice, setModalSetPrice] = useState<DraftPick | null>(null);
  const [releaseModalPick, setReleaseModalPick] = useState<DraftPick | null>(null);

  const [ownTeamCollapsed, setOwnTeamCollapsed] = useState(false);
  const [filterName, setFilterName] = useState('');
  const [filterTiers, setFilterTiers] = useState<Set<Tier>>(new Set());

  const [showTradesModal, setShowTradesModal] = useState(false);
  const [modalProposeTrade, setModalProposeTrade] = useState<{ responder: string; responderPokemon: { name: string; id: number } } | null>(null);

  const [copiedTeam, setCopiedTeam] = useState<string | null>(null);
  const [detailEntry, setDetailEntry] = useState<ClosedListEntry | null>(null);

  // Deep-link: al llegar desde el aviso de intercambios pendientes, abrir el modal.
  const location = useLocation();
  useEffect(() => {
    const navState = location.state as { openTrades?: boolean } | null;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- pendiente, roadmap-frontend.md Fase 3
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
  const entryByName = new Map(closedList.map((e) => [e.pokemonName, e]));

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

  const DAY_NAMES: Record<number, string> = {
    1: 'lunes', 2: 'martes', 3: 'miércoles', 4: 'jueves',
    5: 'viernes', 6: 'sábado', 7: 'domingo',
  };
  const stealDayLabel = DAY_NAMES[leagueSettings?.stealWindowCloseDay ?? 4] ?? 'jueves';
  const stealTimeLabel = leagueSettings?.stealWindowCloseTime ?? '23:59';
  const swapDayLabel  = DAY_NAMES[leagueSettings?.swapWindowCloseDay ?? 5] ?? 'viernes';
  const swapTimeLabel  = leagueSettings?.swapWindowCloseTime ?? '16:00';

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

  function exportTeamToShowdown(picks: DraftPick[], teamUsername: string) {
    const text = picks
      .map((p) => p.pokemonName.split('-').map((w) => w[0].toUpperCase() + w.slice(1)).join('-'))
      .join('\n\n');
    Clipboard.write({ string: text }).then(() => {
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
      queryClient.invalidateQueries({ queryKey: ['draft-status', leagueId] });
      queryClient.invalidateQueries({ queryKey: ['bench', leagueId] });
      queryClient.invalidateQueries({ queryKey: ['my-coins', leagueId] });
      addToast('success', 'Intercambio realizado');
    },
    onError: (err) => addToast('error', extractErrorMessage(err, 'Error al intercambiar')),
  });

  const { mutate: doSteal, isPending: stealing } = useMutation({
    mutationFn: (targetPokemonName: string) => stealPokemon(leagueId!, targetPokemonName),
    onSuccess: () => {
      Haptics.impact({ style: ImpactStyle.Heavy });
      setRivalModalPick(null);
      setRivalGoingToSteal(false);
      queryClient.invalidateQueries({ queryKey: ['draft-status', leagueId] });
      queryClient.invalidateQueries({ queryKey: ['my-coins', leagueId] });
      addToast('success', '¡Pokémon robado!');
    },
    onError: (err) => addToast('error', extractErrorMessage(err, 'Error al robar')),
  });

  const { mutate: doSetPrice, isPending: settingPrice } = useMutation({
    mutationFn: ({ pokemonName, newPrice }: { pokemonName: string; newPrice: number }) =>
      setStealPrice(leagueId!, pokemonName, newPrice),
    onSuccess: () => {
      setModalSetPrice(null);
      queryClient.invalidateQueries({ queryKey: ['draft-status', leagueId] });
      queryClient.invalidateQueries({ queryKey: ['my-coins', leagueId] });
      addToast('success', 'Precio de robo actualizado');
    },
    onError: (err) => addToast('error', extractErrorMessage(err, 'Error al establecer precio')),
  });

  const { mutate: doBuy, isPending: buying } = useMutation({
    mutationFn: (pokemonName: string) => buyFromBench(leagueId!, pokemonName),
    onSuccess: () => {
      setModalBench(null);
      setBenchGoingToSwap(false);
      queryClient.invalidateQueries({ queryKey: ['draft-status', leagueId] });
      queryClient.invalidateQueries({ queryKey: ['bench', leagueId] });
      queryClient.invalidateQueries({ queryKey: ['my-coins', leagueId] });
      addToast('success', 'Pokémon comprado');
    },
    onError: (err) => addToast('error', extractErrorMessage(err, 'Error al comprar')),
  });

  const { mutate: doRelease, isPending: releasing } = useMutation({
    mutationFn: (pokemonName: string) => releasePokemon(leagueId!, pokemonName),
    onSuccess: () => {
      Haptics.impact({ style: ImpactStyle.Medium });
      const name = releaseModalPick?.pokemonName ?? '';
      const tier = tierByName.get(name);
      const reward = Math.floor(priceForTier(leagueSettings, tier) / 2);
      setReleaseModalPick(null);
      queryClient.invalidateQueries({ queryKey: ['draft-status', leagueId] });
      queryClient.invalidateQueries({ queryKey: ['bench', leagueId] });
      queryClient.invalidateQueries({ queryKey: ['my-coins', leagueId] });
      addToast('success', `${name} liberado — +${reward} monedas`);
    },
    onError: (err) => addToast('error', extractErrorMessage(err, 'Error al liberar')),
  });

  // ── Data ────────────────────────────────────────────────────────────────────

  const teams = deriveTeams(draft);

  const myTeam = teams.find((t) => t.username === username);
  const isDraftCompleted = draft?.status === 'COMPLETED';
  const myBalance = myCoins?.coins ?? 0;

  const filterActive = filterName.trim() !== '' || filterTiers.size > 0;

  const filteredRivals = teams
    .filter((t) => t.username !== username)
    .map((team) => ({
      username: team.username,
      picks: filterActive
        ? team.picks.filter((pick) => {
            const nameMatch =
              !filterName.trim() ||
              pick.pokemonName.toLowerCase().includes(filterName.trim().toLowerCase());
            const tierMatch =
              filterTiers.size === 0 ||
              filterTiers.has(tierByName.get(pick.pokemonName) as Tier);
            return nameMatch && tierMatch;
          })
        : team.picks,
    }))
    .filter((team) => !filterActive || team.picks.length > 0);

  function handleBenchCardClick(entry: BenchEntry) {
    setBenchGoingToSwap(false);
    setModalBench(entry);
  }

  function showDetail(pick: DraftPick) {
    setDetailEntry(entryByName.get(pick.pokemonName) ?? null);
  }

  return (
    <div className="page-wrapper">
      <PageHeader
        left={
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button className="btn-back" onClick={() => navigate(`/leagues/${leagueId}/draft`)}>← Draft</button>
            <span className="logo" onClick={() => navigate('/leagues')}>PokeFantasy</span>
          </div>
        }
        rightExtra={isDraftCompleted ? (
          <button
            className="btn-ghost"
            style={{ position: 'relative' }}
            onClick={() => setShowTradesModal(true)}
          >
            Intercambios
            {pendingIncomingCount > 0 && (
              <span style={{
                position: 'absolute', top: -6, right: -6,
                background: 'var(--accent)', color: '#fff',
                fontSize: '0.65rem', fontWeight: 700,
                borderRadius: '50%', width: 18, height: 18,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {pendingIncomingCount}
              </span>
            )}
          </button>
        ) : undefined}
      />

      {/* Bench action modal — choose swap or buy */}
      {modalBench && myTeam && !benchGoingToSwap && (
        <BenchActionModal
          benchEntry={modalBench}
          myPicks={myTeam.picks}
          myBalance={myBalance}
          tierByName={tierByName}
          buying={buying}
          onChooseSwap={() => setBenchGoingToSwap(true)}
          onBuyConfirm={() => doBuy(modalBench.pokemonName)}
          onClose={() => { setModalBench(null); setBenchGoingToSwap(false); }}
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
          onConfirm={(give) => doSwap({ give, take: modalBench.pokemonName })}
          onClose={() => { setModalBench(null); setBenchGoingToSwap(false); }}
          onBack={() => setBenchGoingToSwap(false)}
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
          onConfirm={() => doSteal(rivalModalPick.pick.pokemonName)}
          onClose={() => { setRivalModalPick(null); setRivalGoingToSteal(false); }}
          onBack={() => setRivalGoingToSteal(false)}
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
          onConfirm={(newPrice) => doSetPrice({ pokemonName: modalSetPrice.pokemonName, newPrice })}
          onClose={() => setModalSetPrice(null)}
        />
      )}

      {/* Release modal */}
      {releaseModalPick && (
        <ReleaseModal
          pick={releaseModalPick}
          rewardCoins={Math.floor(priceForTier(leagueSettings, tierByName.get(releaseModalPick.pokemonName)) / 2)}
          currentCoins={myBalance}
          tierByName={tierByName}
          releasing={releasing}
          onConfirm={() => doRelease(releaseModalPick.pokemonName)}
          onClose={() => setReleaseModalPick(null)}
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

      {detailEntry && (
        <PokemonDetailModal
          pokemonId={detailEntry.pokemonId}
          pokemonName={detailEntry.pokemonName}
          tier={detailEntry.tier}
          stats={detailEntry.stats}
          types={detailEntry.types}
          onClose={() => setDetailEntry(null)}
        />
      )}

      <main className="page-content">
        <h1 className="page-title">Equipos</h1>

        {isLoading && <SkeletonGrid count={6} />}

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
            🔓 Ventana de intercambios abierta — cierra el {swapDayLabel} a las {swapTimeLabel}
          </div>
        )}

        {stealWindowOpen ? (
          <div className="my-turn-banner" style={{
            background: 'rgba(251,191,36,0.07)',
            borderColor: 'rgba(251,191,36,0.25)',
            color: '#fbbf24',
            marginBottom: '0.75rem',
          }}>
            🔓 Ventana de robos abierta — cierra el {stealDayLabel} a las {stealTimeLabel}
          </div>
        ) : (
          <div className="my-turn-banner" style={{
            background: 'rgba(248,113,113,0.07)',
            borderColor: 'rgba(248,113,113,0.25)',
            color: '#f87171',
            marginBottom: '0.75rem',
          }}>
            🔒 Robos cerrados — la ventana abre el {stealDayLabel} de la semana de la jornada
          </div>
        )}

        {draft && teams.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem', marginTop: '1.5rem' }}>
            {myTeam && (
              <OwnTeamPanel
                team={myTeam}
                maxTeamSize={maxTeamSize}
                myCoins={myCoins?.coins}
                isDraftCompleted={isDraftCompleted}
                collapsed={ownTeamCollapsed}
                onToggleCollapse={() => setOwnTeamCollapsed((c) => !c)}
                copied={copiedTeam === myTeam.username}
                onExportShowdown={() => exportTeamToShowdown(myTeam.picks, myTeam.username)}
                tierByName={tierByName}
                stealWindowOpen={stealWindowOpen}
                swapWindowClosed={swapWindowClosed}
                effectiveStealPrice={effectiveStealPrice}
                onRaisePrice={(pick) => setModalSetPrice(pick)}
                onRelease={(pick) => setReleaseModalPick(pick)}
                onInfo={showDetail}
              />
            )}

            {teams.some((t) => t.username !== username) && (
              <TeamFilterBar
                filterName={filterName}
                onFilterNameChange={setFilterName}
                filterTiers={filterTiers}
                onToggleTier={(tier) => setFilterTiers((prev) => {
                  const next = new Set(prev);
                  if (next.has(tier)) next.delete(tier);
                  else next.add(tier);
                  return next;
                })}
                onClear={() => { setFilterName(''); setFilterTiers(new Set()); }}
                filterActive={filterActive}
                filteredTeamCount={filteredRivals.length}
                filteredPokemonCount={filteredRivals.reduce((acc, t) => acc + t.picks.length, 0)}
              />
            )}

            <RivalTeamsList
              teams={filteredRivals}
              maxTeamSize={maxTeamSize}
              isDraftCompleted={isDraftCompleted}
              copiedTeam={copiedTeam}
              onExportShowdown={(team) => exportTeamToShowdown(team.picks, team.username)}
              tierByName={tierByName}
              stealWindowOpen={stealWindowOpen}
              effectiveStealPrice={effectiveStealPrice}
              myBalance={myBalance}
              onInfo={showDetail}
              onSteal={(pick, responder) => setRivalModalPick({ pick, responder })}
              onProposeTrade={(pick, responder) => setModalProposeTrade({
                responder,
                responderPokemon: { name: pick.pokemonName, id: pick.pokemonId },
              })}
            />
          </div>
        )}

        {isDraftCompleted && (
          <BenchSection
            bench={bench}
            swapWindowClosed={swapWindowClosed}
            canInteract={!!myTeam}
            myBalance={myBalance}
            tierByName={tierByName}
            entryByName={entryByName}
            onCardClick={handleBenchCardClick}
            onInfo={setDetailEntry}
          />
        )}
      </main>
    </div>
  );
}
