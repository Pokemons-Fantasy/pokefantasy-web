import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { useAuthStore } from '../store/authStore';
import { getDraftStatus, draftPick, getClosedList, cancelDraft, autoPickDraft } from '../api/pokemons';
import type { ClosedListEntry } from '../api/pokemons';
import { SkeletonTable } from '../components/SkeletonTable';
import PokemonDetailModal from '../components/PokemonDetailModal';
import { getLeagueDetail, getLeagueSettings } from '../api/leagues';
import { openEventStream } from '../api/sse';
import DraftBoard from '../components/draft/DraftBoard';
import DraftPoolGrid from '../components/draft/DraftPoolGrid';
import { useDraftFavorites } from '../hooks/useDraftFavorites';
import SetupTierBoard from '../components/draftSetup/SetupTierBoard';
import Notice from '../components/Notice';
import ConfirmDialog from '../components/ConfirmDialog';
import { buildDraftBoard } from '../utils/draftBoard';
import { canAfford, draftPrice, remainingBudget, spendingByPlayer } from '../utils/draftBudget';
import { coinsLabel } from '../utils/coins';
import { useToastStore } from '../store/toastStore';
import { extractErrorMessage } from '../utils/errorMessage';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { showsTiers } from '../utils/pool';
import { useReducedMotion } from '../hooks/useReducedMotion';
import PushPrompt from '../components/push/PushPrompt';

export default function DraftPage() {
  const { leagueId } = useParams<{ leagueId: string }>();
  const username = useAuthStore((s) => s.username);
  const queryClient = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [detailEntry, setDetailEntry] = useState<ClosedListEntry | null>(null);
  const [pendingPick, setPendingPick] = useState<ClosedListEntry | null>(null);
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

  return (
    <>
      <main className="page-content">
        <div className="section-header">
          <h1 className="page-title">Draft</h1>
          <div className="section-actions">
            {isAdmin && draft?.status === 'IN_PROGRESS' && (
              <button className="btn-danger" onClick={() => setShowCancelModal(true)}>
                Cancelar draft
              </button>
            )}
          </div>
        </div>

        {(draft?.status === 'PENDING' || draft?.status === 'IN_PROGRESS') && <PushPrompt context="draft" />}

        {isLoading && <SkeletonTable rows={5} />}
        {!isLoading && !draft && (
          <div className="empty-state">
            <p>No hay draft activo en esta liga.</p>
            <p style={{ marginTop: '0.4rem' }}>El admin debe prepararlo desde Miembros.</p>
          </div>
        )}

        {draft && (
          <div className="draft-status-bar">
            <div>
              <div className="draft-stat-label">Estado</div>
              <div className={`draft-stat-value ${statusClass}`}>{statusLabel}</div>
            </div>
            {draft.status === 'IN_PROGRESS' && (
              <div>
                <div className="draft-stat-label">Turno actual</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div className="draft-stat-value accent">{draft.currentTurn}</div>
                  {secondsLeft !== null && (() => {
                    const urgent = secondsLeft <= 10;
                    const urgency = urgent ? (10 - secondsLeft) / 10 : 0; // 0..1
                    return (
                      <motion.span
                        key={urgent ? 'urgent' : 'calm'}
                        animate={urgent && !prefersReducedMotion ? { scale: [1, 1.06 + urgency * 0.14, 1] } : { scale: 1 }}
                        transition={
                          urgent && !prefersReducedMotion
                            ? { duration: 0.9 - urgency * 0.5, repeat: Infinity, ease: 'easeInOut' }
                            : { duration: 0.2 }
                        }
                        style={{
                          display: 'inline-block',
                          fontWeight: 600,
                          fontSize: '0.875rem',
                          color: urgent ? 'var(--danger)' : 'var(--text-2)',
                        }}
                      >
                        ⏱ {secondsLeft}s
                      </motion.span>
                    );
                  })()}
                </div>
              </div>
            )}
            {draft.status === 'IN_PROGRESS' && (
              <div>
                <div className="draft-stat-label">Ronda</div>
                <div className="draft-stat-value">{draft.currentRound}</div>
              </div>
            )}
            <div>
              <div className="draft-stat-label">Picks del draft</div>
              <div className="draft-stat-value">
                {draftInProgress
                  ? `${history.length} de ${draft.turnOrder.length * totalRounds}`
                  : history.length}
              </div>
            </div>
            {myRemaining !== null && draftInProgress && (
              <div>
                <div className="draft-stat-label">Te quedan</div>
                <div className="draft-stat-value">{myRemaining} 🪙</div>
              </div>
            )}
          </div>
        )}

        {draft?.status === 'PENDING' && (
          <>
            {isAdmin ? (
              <Link className="btn-primary" to={`/leagues/${leagueId}/draft/setup`}>Continuar la preparación</Link>
            ) : (
              <Notice variant="info">El admin está preparando el draft</Notice>
            )}
            {config && (
              <>
                <p className="section-label">
                  Presupuesto: {coinsLabel(config.budget)}{config.snake ? ' · snake' : ''}
                </p>
                <SetupTierBoard pool={pool} config={config} readOnly />
              </>
            )}
          </>
        )}

        {draftInProgress && iAmOut && (
          <Notice variant="info">
            {myTeamSize >= totalRounds
              ? 'Tu draft ha terminado: tienes el equipo completo'
              : 'Tu draft ha terminado: no te llega para ningún Pokémon libre'}
          </Notice>
        )}

        {draftInProgress && draft && (
          <>
            {!iAmOut && (isMyTurn ? (
              <div className="my-turn-banner animate-in">
                <span className="my-turn-dot" />
                ⚡ ¡Es tu turno! Elige un Pokémon del pool
              </div>
            ) : (
              <p style={{ color: 'var(--text-2)', fontSize: '0.9rem' }}>
                Esperando el turno de <strong style={{ color: 'var(--accent)' }}>{draft.currentTurn}</strong>.
                Mientras, puedes ir mirando el pool y marcar tus favoritos ☆.
              </p>
            ))}
            {/* Visible todo el draft: fuera de tu turno solo se consulta; en tu turno, además, se elige */}
            <DraftPoolGrid
              entries={availablePool}
              config={config}
              remaining={myRemaining}
              canPick={isMyTurn && !iAmOut}
              picking={picking}
              favorites={favorites}
              onToggleFavorite={toggleFavorite}
              onPick={setPendingPick}
              onInfo={setDetailEntry}
            />
          </>
        )}

        {board && (history.length > 0 || draftInProgress) && (
          <div style={{ marginTop: '2.5rem' }}>
            <p className="section-label">Tablero</p>
            <DraftBoard
              board={board}
              me={username}
              tierByName={tierByName}
              onSelect={(name) => setDetailEntry(entryByName.get(name) ?? null)}
              budgets={draft.budgets}
              spending={spending}
            />
          </div>
        )}

        {draft?.status === 'COMPLETED' && history.length === 0 && (
          <div style={{ marginTop: '2rem' }}>
            <Notice variant="info">
              Esta liga se drafteó antes de que se guardara el historial del draft, así que no hay tablero.
            </Notice>
            <Link className="btn-ghost" to={`/leagues/${leagueId}/teams`}>Ver equipos</Link>
          </div>
        )}
      </main>

      {showCancelModal && (
        <ConfirmDialog
          title="¿Cancelar el draft?"
          message="Se reabren las nominaciones y el pool pierde los tiers. Los picks hechos no cuentan: el siguiente draft empieza de cero."
          confirmLabel="Sí, cancelar el draft"
          cancelLabel="Seguir con el draft"
          pendingLabel="Cancelando..."
          pending={cancelling}
          danger
          onConfirm={() => cancel()}
          onClose={() => setShowCancelModal(false)}
        />
      )}
      {pendingPick && (
        <div className="modal-overlay" onClick={() => setPendingPick(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>¿Confirmar pick?</h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-2)' }}>
              Vas a elegir a <strong>{pendingPick.pokemonName}</strong>
              {config && myRemaining !== null && (
                <> por {coinsLabel(priceOf(pendingPick))}: te quedarán {coinsLabel(myRemaining - priceOf(pendingPick))}</>
              )}. Esta acción no se puede deshacer.
            </p>
            <div className="modal-actions">
              <button className="btn-ghost" onClick={() => setPendingPick(null)}>
                Cancelar
              </button>
              <button
                className="btn-primary"
                disabled={picking}
                onClick={() => {
                  pick(pendingPick.pokemonName);
                  setPendingPick(null);
                }}
              >
                {picking ? 'Eligiendo...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
      {detailEntry && (
        <PokemonDetailModal
          pokemonId={detailEntry.pokemonId}
          pokemonName={detailEntry.pokemonName}
          tier={tiered ? detailEntry.tier : undefined}
          stats={detailEntry.stats}
          types={detailEntry.types}
          onClose={() => setDetailEntry(null)}
        />
      )}
    </>
  );
}
