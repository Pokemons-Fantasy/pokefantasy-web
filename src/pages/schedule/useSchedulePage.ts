import { useEffect, useId, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import {
  getLeagueDetail,
  getLeagueSettings,
  getSchedule,
  recordMatchResult,
  correctMatchResult,
  revertMatchResult,
  getMyCoinBalance,
  type MatchDto,
  type JornadaDto,
} from '../../api/leagues';
import { getDraftStatus } from '../../api/pokemons';
import { deriveTeams } from '../../utils/teams';
import { BATTLE_DEFAULTS } from '../../utils/showdown';
import { useToastStore } from '../../store/toastStore';
import { extractErrorMessage } from '../../utils/errorMessage';
import { parseScore } from '../../utils/score';
import { jornadaStates, nextMatchFor } from '../../utils/schedule';

/**
 * Estado y acciones del Calendario: queries, resultados, modales abiertos y jornadas.
 * Lo comparten la vista de escritorio y la de móvil (y los modales, que se pintan una vez).
 */
export function useSchedulePage() {
  const { leagueId } = useParams<{ leagueId: string }>();
  const username = useAuthStore((s) => s.username);
  const queryClient = useQueryClient();

  const addToast = useToastStore((s) => s.addToast);
  const [pendingMatch, setPendingMatch] = useState<MatchDto | null>(null);
  const [editingMatch, setEditingMatch] = useState<MatchDto | null>(null);
  const recordTitleId = useId();
  const editTitleId = useId();
  // Jornadas jugadas desplegadas (van plegadas por defecto)
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  // Marcador del modal abierto (texto de los inputs): ganador – perdedor.
  const [winnerScore, setWinnerScore] = useState('');
  const [loserScore, setLoserScore] = useState('');
  const { score, error: scoreError } = parseScore(winnerScore, loserScore);

  function openRecord(match: MatchDto) {
    setWinnerScore('');
    setLoserScore('');
    setPendingMatch(match);
  }

  function openEdit(match: MatchDto) {
    setWinnerScore(match.winnerScore != null ? String(match.winnerScore) : '');
    setLoserScore(match.loserScore != null ? String(match.loserScore) : '');
    setEditingMatch(match);
  }

  const { data: league } = useQuery({
    queryKey: ['league-detail', leagueId],
    queryFn: () => getLeagueDetail(leagueId!),
    enabled: !!leagueId,
  });

  const { data: schedule, isLoading } = useQuery({
    queryKey: ['schedule', leagueId],
    queryFn: () => getSchedule(leagueId!),
    enabled: !!leagueId,
  });

  const { data: myCoins } = useQuery({
    queryKey: ['my-coins', leagueId],
    queryFn: () => getMyCoinBalance(leagueId!),
    enabled: !!leagueId,
    staleTime: 30_000,
  });

  const isAdmin = league?.members.some(
    (m) => m.username === username && m.leagueRole === 'ADMIN'
  );

  // "Jugar en Showdown" y alineación: los ajustes solo se piden al abrir uno de los modales; el draft
  // siempre, porque da los sprites de las alineaciones (y suele estar ya en caché).
  const [playingMatch, setPlayingMatch] = useState<MatchDto | null>(null);
  const [lineupMatch, setLineupMatch] = useState<MatchDto | null>(null);
  const { data: leagueSettings, status: settingsStatus } = useQuery({
    queryKey: ['league-settings', leagueId],
    queryFn: () => getLeagueSettings(leagueId!),
    enabled: !!leagueId && (!!playingMatch || !!lineupMatch),
    staleTime: 5 * 60_000,
  });
  const { data: draft, status: draftStatus } = useQuery({
    queryKey: ['draft-status', leagueId],
    queryFn: () => getDraftStatus(leagueId!),
    enabled: !!leagueId,
    staleTime: 60_000,
  });
  const playStatus: 'error' | 'ready' | 'loading' = settingsStatus === 'error' || draftStatus === 'error' ? 'error'
    : settingsStatus === 'success' && draftStatus === 'success' ? 'ready' : 'loading';
  const showdownNameOf = (player: string) => league?.members.find((m) => m.username === player)?.showdownName;
  const myPicks = deriveTeams(draft).find((t) => t.username === username)?.picks ?? [];
  const spriteIds = new Map((draft?.picks ?? []).map((p) => [p.pokemonName, p.pokemonId]));

  // El modal de alineación necesita los ajustes (lista abierta o cerrada) y mi equipo: se cargan al pulsar,
  // y si fallan se avisa en vez de no hacer nada.
  async function openLineup(match: MatchDto) {
    try {
      await Promise.all([
        queryClient.fetchQuery({ queryKey: ['league-settings', leagueId], queryFn: () => getLeagueSettings(leagueId!),
          staleTime: 5 * 60_000 }),
        queryClient.fetchQuery({ queryKey: ['draft-status', leagueId], queryFn: () => getDraftStatus(leagueId!),
          staleTime: 60_000 }),
      ]);
      setLineupMatch(match);
    } catch {
      addToast('error', 'No se pudieron cargar los ajustes de la liga. Inténtalo de nuevo.');
    }
  }

  // El import necesita el formato de la serie (bestOf) de la liga.
  const [importMatch, setImportMatch] = useState<MatchDto | null>(null);
  const [importBestOf, setImportBestOf] = useState<number>(BATTLE_DEFAULTS.bestOf);
  async function openImport(match: MatchDto) {
    try {
      const settings = await queryClient.fetchQuery({ queryKey: ['league-settings', leagueId],
        queryFn: () => getLeagueSettings(leagueId!), staleTime: 5 * 60_000 });
      setImportBestOf(settings.bestOf ?? BATTLE_DEFAULTS.bestOf);
      setImportMatch(match);
    } catch {
      addToast('error', 'No se pudieron cargar los ajustes de la liga. Inténtalo de nuevo.');
    }
  }

  const { mutate: recordResult, isPending: recording } = useMutation({
    mutationFn: ({ matchId, winner }: { matchId: string; winner: string }) =>
      recordMatchResult(leagueId!, matchId, winner, score),
    onSuccess: () => {
      setPendingMatch(null);
      addToast('success', 'Resultado guardado');
      queryClient.invalidateQueries({ queryKey: ['schedule', leagueId] });
      queryClient.invalidateQueries({ queryKey: ['my-coins', leagueId] });
      queryClient.invalidateQueries({ queryKey: ['standings', leagueId] });
    },
    onError: (err) => {
      addToast('error', extractErrorMessage(err, 'Error al registrar el resultado'));
    },
  });

  /** Tras cambiar un resultado se mueven monedas, clasificación, estadísticas y feed. */
  function invalidateAfterResultChange() {
    queryClient.invalidateQueries({ queryKey: ['schedule', leagueId] });
    queryClient.invalidateQueries({ queryKey: ['my-coins', leagueId] });
    queryClient.invalidateQueries({ queryKey: ['standings', leagueId] });
    queryClient.invalidateQueries({ queryKey: ['season-stats', leagueId] });
    queryClient.invalidateQueries({ queryKey: ['activity', leagueId] });
  }

  const { mutate: correctResult, isPending: correcting } = useMutation({
    mutationFn: ({ matchId, winner }: { matchId: string; winner: string }) =>
      correctMatchResult(leagueId!, matchId, winner, score),
    onSuccess: () => {
      setEditingMatch(null);
      addToast('success', 'Resultado corregido');
      invalidateAfterResultChange();
    },
    onError: (err) => addToast('error', extractErrorMessage(err, 'Error al corregir el resultado')),
  });

  const { mutate: revertResult, isPending: reverting } = useMutation({
    mutationFn: (matchId: string) => revertMatchResult(leagueId!, matchId),
    onSuccess: () => {
      setEditingMatch(null);
      addToast('success', 'Resultado anulado: el partido vuelve a estar pendiente');
      invalidateAfterResultChange();
    },
    onError: (err) => addToast('error', extractErrorMessage(err, 'Error al anular el resultado')),
  });

  const editing = correcting || reverting;

  const jornadas = schedule?.jornadas ?? [];
  const states = jornadaStates(jornadas);
  const currentIndex = states.indexOf('current');
  const next = nextMatchFor(jornadas, username);

  // Mitad del calendario para etiquetar primera / segunda vuelta
  const halfPoint = Math.ceil(jornadas.length / 2);

  function jornadaLabel(j: JornadaDto) {
    const vuelta = j.roundNumber <= halfPoint ? 'Primera vuelta' : 'Segunda vuelta';
    return `Jornada ${j.roundNumber} · ${vuelta}`;
  }

  function toggleJornada(roundNumber: number) {
    setExpanded((prev) => {
      const nextSet = new Set(prev);
      if (nextSet.has(roundNumber)) nextSet.delete(roundNumber);
      else nextSet.add(roundNumber);
      return nextSet;
    });
  }

  // Al llegar, se lleva la jornada actual a la vista (una sola vez; 'nearest' no mueve si ya se ve)
  const currentRef = useRef<HTMLElement>(null);
  const scrolledToCurrent = useRef(false);
  useEffect(() => {
    const el = currentRef.current;
    if (!el || scrolledToCurrent.current) return;
    scrolledToCurrent.current = true;
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    el.scrollIntoView?.({ block: 'nearest', behavior: reduceMotion ? 'auto' : 'smooth' });
  }, [currentIndex]);

  return {
    leagueId,
    username,
    queryClient,
    addToast,
    pendingMatch,
    setPendingMatch,
    editingMatch,
    setEditingMatch,
    recordTitleId,
    editTitleId,
    expanded,
    setExpanded,
    winnerScore,
    setWinnerScore,
    loserScore,
    setLoserScore,
    score,
    scoreError,
    openRecord,
    openEdit,
    league,
    schedule,
    isLoading,
    myCoins,
    isAdmin,
    playingMatch,
    setPlayingMatch,
    lineupMatch,
    setLineupMatch,
    leagueSettings,
    settingsStatus,
    draft,
    draftStatus,
    playStatus,
    showdownNameOf,
    myPicks,
    spriteIds,
    openLineup,
    importMatch,
    setImportMatch,
    importBestOf,
    setImportBestOf,
    openImport,
    recordResult,
    recording,
    invalidateAfterResultChange,
    correctResult,
    correcting,
    revertResult,
    reverting,
    editing,
    jornadas,
    states,
    currentIndex,
    next,
    halfPoint,
    jornadaLabel,
    toggleJornada,
    currentRef,
    scrolledToCurrent,
  };
}

export type SchedulePageModel = ReturnType<typeof useSchedulePage>;
