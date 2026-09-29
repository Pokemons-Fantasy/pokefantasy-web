import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Navigate, useBlocker, useNavigate, useParams } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useToastStore } from '../store/toastStore';
import {
  cancelDraft, getClosedList, getDraftStatus, resetDraftPoolTiers, setDraftPoolTiers, startPreparedDraft,
  updateDraftConfig,
} from '../api/pokemons';
import type { DraftStatus, Tier } from '../api/pokemons';
import { getLeagueDetail, getLeagueSettings } from '../api/leagues';
import { extractErrorMessage } from '../utils/errorMessage';
import { sameSetup, setupError, type SetupForm } from '../utils/draftSetup';
import { coverageHint } from '../utils/draftBudget';
import { syncTurnOrder } from '../utils/turnOrder';
import DraftBudgetForm from '../components/draftSetup/DraftBudgetForm';
import SetupTierBoard from '../components/draftSetup/SetupTierBoard';
import TurnOrderEditor from '../components/draft/TurnOrderEditor';
import ConfirmDialog from '../components/ConfirmDialog';
import SaveBar from '../components/SaveBar';
import Notice from '../components/Notice';
import { SkeletonTable } from '../components/SkeletonTable';

type Pending = 'start' | 'reset' | 'back' | null;

/** Preparación del draft (admin, draft en PENDING): presupuesto, precios, orden de turnos, snake y tiers. */
export default function DraftSetupPage() {
  const { leagueId } = useParams<{ leagueId: string }>();
  const username = useAuthStore((s) => s.username);
  const addToast = useToastStore((s) => s.addToast);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [edits, setEdits] = useState<Partial<SetupForm>>({});
  const [confirm, setConfirm] = useState<Pending>(null);

  const { data: draft, isLoading, isFetching } = useQuery({
    queryKey: ['draft-status', leagueId], queryFn: () => getDraftStatus(leagueId!), enabled: !!leagueId,
  });
  const { data: pool = [] } = useQuery({
    queryKey: ['closed-list', leagueId], queryFn: () => getClosedList(leagueId!), enabled: !!leagueId,
  });
  const { data: league } = useQuery({
    queryKey: ['league-detail', leagueId], queryFn: () => getLeagueDetail(leagueId!), enabled: !!leagueId,
  });
  const { data: settings } = useQuery({
    queryKey: ['league-settings', leagueId], queryFn: () => getLeagueSettings(leagueId!), enabled: !!leagueId,
    staleTime: 120_000,
  });
  const rounds = settings?.maxTeamSize ?? 10;

  const members = league?.members.map((m) => m.username) ?? [];
  const isAdmin = !!league?.members.some((m) => m.username === username && m.leagueRole === 'ADMIN');
  const saved: SetupForm | null = draft?.config ? { ...draft.config, turnOrder: draft.turnOrder } : null;
  // El orden se sincroniza con los miembros: quien entró después de preparar va al final y cuenta como cambio.
  const form: SetupForm | null = saved && {
    ...saved, ...edits, turnOrder: syncTurnOrder(edits.turnOrder ?? saved.turnOrder, members),
  };
  const dirty = !!form && !!saved && !sameSetup(form, saved);
  const error = form ? setupError(form) : null;
  const hint = form ? coverageHint(form, rounds, pool.map((e) => e.tier).filter((t): t is Tier => !!t)) : null;

  const blocker = useBlocker(({ currentLocation, nextLocation }) =>
    dirty && currentLocation.pathname !== nextLocation.pathname);

  const refreshDraft = () => queryClient.invalidateQueries({ queryKey: ['draft-status', leagueId] });
  const refreshPool = () => queryClient.invalidateQueries({ queryKey: ['closed-list', leagueId] });

  const { mutate: save, isPending: saving } = useMutation({
    mutationFn: (payload: SetupForm) => updateDraftConfig(leagueId!, payload),
    onSuccess: (_data, payload) => {
      const { turnOrder, ...config } = payload;
      // Lo guardado pasa a ser la referencia ya: sin esto, salir antes del refetch pediría confirmación
      queryClient.setQueryData<DraftStatus | null>(['draft-status', leagueId],
        (old) => old && { ...old, config, turnOrder });
      setEdits({});
      refreshDraft();
      addToast('success', 'Configuración del draft guardada');
    },
    onError: (err) => addToast('error', extractErrorMessage(err, 'No se pudo guardar la configuración')),
  });

  const { mutate: move, isPending: moving } = useMutation({
    mutationFn: ({ ids, tier }: { ids: string[]; tier: Tier }) => setDraftPoolTiers(leagueId!, ids, tier),
    onSuccess: (_data, { ids, tier }) => {
      refreshPool();
      addToast('success', `${ids.length} Pokémon al tier ${tier}`);
    },
    onError: (err) => addToast('error', extractErrorMessage(err, 'No se pudieron mover los Pokémon')),
  });

  const { mutate: reset, isPending: resetting } = useMutation({
    mutationFn: () => resetDraftPoolTiers(leagueId!),
    onSuccess: () => {
      setConfirm(null);
      refreshPool();
      addToast('success', 'Tiers recalculados por BST');
    },
    onError: (err) => {
      setConfirm(null);
      addToast('error', extractErrorMessage(err, 'No se pudieron recalcular los tiers'));
    },
  });

  const { mutate: start, isPending: starting } = useMutation({
    mutationFn: () => startPreparedDraft(leagueId!),
    onSuccess: () => {
      setConfirm(null);
      refreshDraft();
      queryClient.invalidateQueries({ queryKey: ['league-detail', leagueId] });
      navigate(`/leagues/${leagueId}/draft`);
    },
    onError: (err) => {
      setConfirm(null);
      addToast('error', extractErrorMessage(err, 'No se pudo empezar el draft'));
    },
  });

  const { mutate: back, isPending: goingBack } = useMutation({
    mutationFn: () => cancelDraft(leagueId!),
    onSuccess: () => {
      setConfirm(null);
      refreshDraft();
      queryClient.invalidateQueries({ queryKey: ['league-detail', leagueId] });
      navigate(`/leagues/${leagueId}/pool`);
    },
    onError: (err) => {
      setConfirm(null);
      addToast('error', extractErrorMessage(err, 'No se pudo volver a nominaciones'));
    },
  });

  // Al llegar desde Miembros la caché aún dice "sin draft": se espera al refetch antes de decidir si redirigir.
  const waitingForDraft = isLoading || (isFetching && draft?.status !== 'PENDING');
  if (waitingForDraft || !league) return <main className="page-content"><SkeletonTable rows={4} /></main>;
  // Solo el admin y solo con el draft en preparación; el resto, a la pantalla del draft.
  if (!isAdmin || draft?.status !== 'PENDING' || !form) return <Navigate to={`/leagues/${leagueId}/draft`} replace />;

  return (
    <>
      <main className="page-content draft-setup">
        <div className="section-header">
          <h1 className="page-title">Preparar draft</h1>
          <span className="draft-setup-meta">{rounds} rondas · {pool.length} Pokémon en el pool</span>
        </div>

        <p className="section-label">Presupuesto y precios</p>
        <DraftBudgetForm form={form} onChange={(patch) => setEdits((prev) => ({ ...prev, ...patch }))} />
        {hint && <Notice variant={hint.tone === 'warning' ? 'warning' : 'info'}>{hint.text}</Notice>}

        <p className="section-label">Orden de turnos</p>
        <TurnOrderEditor order={form.turnOrder} onChange={(turnOrder) => setEdits((prev) => ({ ...prev, turnOrder }))} />

        {dirty && (
          <SaveBar
            summary="Cambios sin guardar en presupuesto, precios u orden"
            error={error}
            saving={saving}
            saveLabel="Guardar"
            onSave={() => save(form)}
            canSave={!error}
            onDiscard={() => setEdits({})}
          />
        )}

        <hr className="divider" />
        <div className="section-header">
          <p className="section-label">Tiers</p>
          <button className="btn-ghost" onClick={() => setConfirm('reset')}>Recalcular por BST</button>
        </div>
        <SetupTierBoard pool={pool} config={form} moving={moving} onMove={(ids, tier) => move({ ids, tier })} />

        <hr className="divider" />
        <div className="draft-setup-actions">
          <button className="btn-danger" onClick={() => setConfirm('back')}>Volver a nominaciones</button>
          <button
            className="btn-primary" disabled={dirty} title={dirty ? 'Guarda los cambios antes de empezar' : undefined}
            onClick={() => setConfirm('start')}
          >
            Empezar draft
          </button>
        </div>
      </main>

      {confirm === 'start' && (
        <ConfirmDialog
          title="¿Empezar el draft?" message="Ya no se podrán cambiar los tiers, los precios ni el orden de turnos."
          confirmLabel="Empezar" pendingLabel="Empezando..." pending={starting}
          onConfirm={() => start()} onClose={() => setConfirm(null)}
        />
      )}
      {confirm === 'reset' && (
        <ConfirmDialog
          title="¿Recalcular los tiers?" message="Se vuelven a repartir por BST y se pierden los cambios hechos a mano."
          confirmLabel="Recalcular" pendingLabel="Recalculando..." pending={resetting}
          onConfirm={() => reset()} onClose={() => setConfirm(null)}
        />
      )}
      {confirm === 'back' && (
        <ConfirmDialog
          title="¿Volver a nominaciones?" message="Se descarta la preparación y se reabren las nominaciones."
          confirmLabel="Volver" pendingLabel="Volviendo..." pending={goingBack} danger
          onConfirm={() => { setEdits({}); back(); }} onClose={() => setConfirm(null)}
        />
      )}
      {blocker.state === 'blocked' && (
        <ConfirmDialog
          title="¿Salir sin guardar?" message="Hay cambios en la configuración del draft que no se han guardado."
          confirmLabel="Salir" pendingLabel="Saliendo..." pending={false} danger
          onConfirm={() => blocker.proceed()} onClose={() => blocker.reset()}
        />
      )}
    </>
  );
}
