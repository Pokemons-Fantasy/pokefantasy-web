import { useState, useEffect, useId, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { getDraftStatus, draftPick, getClosedList, cancelDraft, autoPickDraft } from '../../api/pokemons';
import type { ClosedListEntry } from '../../api/pokemons';
import { getLeagueDetail, getLeagueSettings } from '../../api/leagues';
import { openEventStream } from '../../api/sse';
import { useDraftFavorites } from '../../hooks/useDraftFavorites';
import { buildDraftBoard } from '../../utils/draftBoard';
import { canAfford, draftPrice, remainingBudget, spendingByPlayer } from '../../utils/draftBudget';
import { coinsLabel } from '../../utils/coins';
import { useToastStore } from '../../store/toastStore';
import { extractErrorMessage } from '../../utils/errorMessage';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { showsTiers } from '../../utils/pool';
import { useReducedMotion } from '../../hooks/useReducedMotion';

/**
 * Estado y acciones del Draft: queries, SSE, temporizador, picks, favoritos y modales.
 * Lo comparten la vista de escritorio y la de móvil (y los modales, que se pintan una vez).
 */
export function useDraftPage() {
  const { leagueId } = useParams<{ leagueId: string }>();
  const username = useAuthStore((s) => s.username);
  const queryClient = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [detailEntry, setDetailEntry] = useState<ClosedListEntry | null>(null);
  const [pendingPick, setPendingPick] = useState<ClosedListEntry | null>(null);
  const pickTitleId = useId();
  const pickMessageId = useId();
  const { favorites, toggle: toggleFavorite } = useDraftFavorites(username, leagueId);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const prefersReducedMotion = useReducedMotion();

  const { data: draft, isLoading } = useQuery({
    queryKey: ['draft-status', leagueId],
    queryFn: () => getDraftStatus(leagueId!),
    enabled: !!leagueId,
  });

  // En preparación los tiers cambian sin que cambie el draft: el SSE también refresca el pool mientras tanto.
  const statusRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    statusRef.current = draft?.status;
  }, [draft?.status]);

  // SSE del draft (exige sesión y ser miembro de la liga). El proxy de Netlify corta la conexión cada
  // <26 s: se reconecta sola y al volver se refresca por si se perdió algún evento; mientras está caída,
  // polling cada 10 s.
  useEffect(() => {
    if (!leagueId) return;
    const refresh = () => {
      queryClient.invalidateQueries({ queryKey: ['draft-status', leagueId] });
      if (statusRef.current === 'PENDING') queryClient.invalidateQueries({ queryKey: ['closed-list', leagueId] });
    };
    let fallback: ReturnType<typeof setInterval> | null = null;
    const stopFallback = () => {
      if (fallback) clearInterval(fallback);
      fallback = null;
    };
    const close = openEventStream(`/v1/leagues/${leagueId}/draft/events`, {
      listeners: { 'draft-updated': refresh },
      onOpen: (reconnected) => {
        stopFallback();
        if (reconnected) refresh();
      },
      onDown: () => {
        if (!fallback) fallback = setInterval(refresh, 10_000);
      },
    });
    return () => {
      close();
      stopFallback();
    };
  }, [leagueId, queryClient]);

  const { data: pool = [], isSuccess: poolLoaded } = useQuery({
    queryKey: ['closed-list', leagueId],
    queryFn: () => getClosedList(leagueId!),
    enabled: !!leagueId,
  });

  const { data: league } = useQuery({
    queryKey: ['league-detail', leagueId],
    queryFn: () => getLeagueDetail(leagueId!),
    enabled: !!leagueId,
  });

  // Rondas del draft = maxTeamSize (mismo valor por defecto que DraftTurnService)
  const { data: settings } = useQuery({
    queryKey: ['league-settings', leagueId],
    queryFn: () => getLeagueSettings(leagueId!),
    enabled: !!leagueId,
    staleTime: 120_000,
  });
  const totalRounds = settings?.maxTeamSize ?? 10;

  const isAdmin = league?.members.some(
    (m) => m.username === username && m.leagueRole === 'ADMIN'
  );

  const pickedNames = new Set(draft?.picks?.map((p) => p.pokemonName) ?? []);
  const availablePool = pool.filter((p) => !pickedNames.has(p.pokemonName));

  const isMyTurn = draft?.status === 'IN_PROGRESS' && draft.currentTurn === username;

  // draftHistory es el draft tal como se jugó; draft.picks son los equipos de ahora (con robos y trades)
  const history = draft?.draftHistory ?? [];
  const draftInProgress = draft?.status === 'IN_PROGRESS';
  const config = draft?.config ?? null;
  const myRemaining = remainingBudget(draft, username);
  const priceOf = (entry: ClosedListEntry) => draftPrice(config, entry.tier);
  const myTeamSize = draft?.picks.filter((p) => p.username === username).length ?? 0;
  const isPlayer = !!username && !!draft?.turnOrder.includes(username);
  // Misma regla que DraftTurnService.canPick; el backend es quien valida. Sin el pool cargado no se sabe.
  const iAmOut = draftInProgress && isPlayer && poolLoaded && myRemaining !== null
    && (myTeamSize >= totalRounds || !availablePool.some((e) => canAfford(priceOf(e), myRemaining)));
  const board = draft && buildDraftBoard({
    history,
    turnOrder: draft.turnOrder,
    currentPicks: draft.picks,
    totalRounds: draftInProgress ? totalRounds : 0,
    current: draftInProgress ? { round: draft.currentRound, username: draft.currentTurn } : null,
    snake: !!config?.snake,
  });
  // Con el draft cancelado los tiers del pool no valen (se recalculan al preparar otro): ni tablero ni ficha los pintan
  const tiered = showsTiers(draft?.status);
  const tierByName = new Map(tiered ? pool.map((p) => [p.pokemonName, p.tier]) : []);
  const entryByName = new Map(pool.map((p) => [p.pokemonName, p]));
  const spending = config ? spendingByPlayer(history, tierByName) : null;

  // Al completarse el draft con la página abierta: aviso de lo que sobró, que ya está en el saldo.
  const prevStatus = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (prevStatus.current === 'IN_PROGRESS' && draft?.status === 'COMPLETED' && myRemaining && myRemaining > 0) {
      addToast('success', `Te sobraron ${coinsLabel(myRemaining)} del draft: pasan a tu saldo`);
      queryClient.invalidateQueries({ queryKey: ['my-coins', leagueId] });
    }
    prevStatus.current = draft?.status;
  }, [draft?.status, myRemaining, addToast, queryClient, leagueId]);

  const { mutate: pick, isPending: picking } = useMutation({
    mutationFn: (pokemonName: string) => draftPick(leagueId!, pokemonName),
    onSuccess: () => {
      Haptics.impact({ style: ImpactStyle.Medium });
      queryClient.invalidateQueries({ queryKey: ['draft-status', leagueId] });
      queryClient.invalidateQueries({ queryKey: ['closed-list', leagueId] });
    },
    onError: (err) => {
      addToast('error', extractErrorMessage(err, 'Error al hacer pick'));
      queryClient.invalidateQueries({ queryKey: ['draft-status', leagueId] });
    },
  });

  const { mutate: cancel, isPending: cancelling } = useMutation({
    mutationFn: () => cancelDraft(leagueId!),
    onSuccess: () => {
      setShowCancelModal(false);
      queryClient.invalidateQueries({ queryKey: ['draft-status', leagueId] });
      queryClient.invalidateQueries({ queryKey: ['league-detail', leagueId] });
      // El pool pierde los tiers al cancelar
      queryClient.invalidateQueries({ queryKey: ['closed-list', leagueId] });
    },
    onError: (err) => {
      setShowCancelModal(false);
      addToast('error', extractErrorMessage(err, 'Error al cancelar el draft'));
    },
  });

  const { mutate: triggerAutoPick } = useMutation({
    mutationFn: () => autoPickDraft(leagueId!),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['draft-status', leagueId] }),
    onError: () => {}, // silenciar — otro cliente puede haber disparado el auto-pick primero
  });

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- pendiente, ver roadmap-frontend.md Fase 1
    if (!draft?.turnDeadline) { setSecondsLeft(null); return; }
    const update = () => {
      const diff = Math.ceil((new Date(draft.turnDeadline!).getTime() - Date.now()) / 1000);
      if (diff <= 0) {
        setSecondsLeft(0);
        triggerAutoPick();
      } else {
        setSecondsLeft(diff);
      }
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft?.turnDeadline]);

  const statusLabel = !draft ? '—'
    : draft.status === 'COMPLETED' ? 'Completado'
    : draft.status === 'IN_PROGRESS' ? 'En progreso'
    : draft.status === 'CANCELLED' ? 'Cancelado'
    : 'En preparación';

  const statusClass = !draft ? 'muted'
    : draft.status === 'COMPLETED' ? 'muted'
    : draft.status === 'IN_PROGRESS' ? 'green'
    : 'muted';

  return {
    leagueId,
    username,
    queryClient,
    addToast,
    showCancelModal,
    setShowCancelModal,
    detailEntry,
    setDetailEntry,
    pendingPick,
    setPendingPick,
    pickTitleId,
    pickMessageId,
    favorites,
    toggleFavorite,
    secondsLeft,
    setSecondsLeft,
    prefersReducedMotion,
    draft,
    isLoading,
    statusRef,
    pool,
    poolLoaded,
    league,
    settings,
    totalRounds,
    isAdmin,
    pickedNames,
    availablePool,
    isMyTurn,
    history,
    draftInProgress,
    config,
    myRemaining,
    priceOf,
    myTeamSize,
    isPlayer,
    iAmOut,
    board,
    tiered,
    tierByName,
    entryByName,
    spending,
    prevStatus,
    pick,
    picking,
    cancel,
    cancelling,
    triggerAutoPick,
    statusLabel,
    statusClass,
  };
}

export type DraftPageModel = ReturnType<typeof useDraftPage>;
