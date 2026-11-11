import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useLocation } from 'react-router-dom';
import { Clipboard } from '@capacitor/clipboard';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { useAuthStore } from '../../store/authStore';
import {
  getDraftStatus, getBench, getClosedList, swapWithBench, buyFromBench, stealPokemon, setStealPrice, releasePokemon,
} from '../../api/pokemons';
import type { BenchEntry, ClosedListEntry, DraftPick, Tier } from '../../api/pokemons';
import { getMyCoinBalance, getSchedule, getLeagueSettings } from '../../api/leagues';
import { getTrades } from '../../api/trades';
import { priceForTier, releaseReward } from '../../utils/tiers';
import { deriveTeams } from '../../utils/teams';
import { showdownTeamText } from '../../utils/showdown';
import { useToastStore } from '../../store/toastStore';
import { extractErrorMessage } from '../../utils/errorMessage';
import { coinsLabel } from '../../utils/coins';

/**
 * Estado y acciones de la página de Equipos: queries, mutaciones, modales abiertos y filtros.
 * Lo comparten la vista de escritorio y la de móvil (y los modales, que se pintan una vez).
 */
export function useTeamsPage() {
  const { leagueId } = useParams<{ leagueId: string }>();
  const username = useAuthStore((s) => s.username);
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
    const text = showdownTeamText(picks.map((p) => p.pokemonName));
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
      const reward = releaseReward(leagueSettings, tier);
      setReleaseModalPick(null);
      queryClient.invalidateQueries({ queryKey: ['draft-status', leagueId] });
      queryClient.invalidateQueries({ queryKey: ['bench', leagueId] });
      queryClient.invalidateQueries({ queryKey: ['my-coins', leagueId] });
      addToast('success', `${name} liberado — +${coinsLabel(reward)}`);
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

  return {
    leagueId,
    username,
    modalBench,
    setModalBench,
    benchGoingToSwap,
    setBenchGoingToSwap,
    rivalModalPick,
    setRivalModalPick,
    rivalGoingToSteal,
    setRivalGoingToSteal,
    modalSetPrice,
    setModalSetPrice,
    releaseModalPick,
    setReleaseModalPick,
    ownTeamCollapsed,
    setOwnTeamCollapsed,
    filterName,
    setFilterName,
    filterTiers,
    setFilterTiers,
    showTradesModal,
    setShowTradesModal,
    modalProposeTrade,
    setModalProposeTrade,
    copiedTeam,
    detailEntry,
    setDetailEntry,
    draft,
    isLoading,
    bench,
    tierByName,
    entryByName,
    myCoins,
    leagueSettings,
    maxTeamSize,
    schedule,
    pendingIncomingCount,
    stealWindowOpen,
    swapWindowClosed,
    effectiveStealPrice,
    exportTeamToShowdown,
    doSwap,
    swapping,
    doSteal,
    stealing,
    doSetPrice,
    settingPrice,
    doBuy,
    buying,
    doRelease,
    releasing,
    teams,
    myTeam,
    isDraftCompleted,
    myBalance,
    filterActive,
    filteredRivals,
    handleBenchCardClick,
    showDetail,
  };
}

export type TeamsPageModel = ReturnType<typeof useTeamsPage>;
