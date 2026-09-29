import { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useBlocker, useParams } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import {
  getLeagueDetail,
  getLeagueSettings,
  updateLeagueSettings,
  type LeagueSettings,
} from '../api/leagues';
import { getClosedList, getDraftStatus } from '../api/pokemons';
import { useToastStore } from '../store/toastStore';
import { extractErrorMessage } from '../utils/errorMessage';
import { SkeletonTable } from '../components/SkeletonTable';
import CoinsMarketSection from '../components/leagueConfig/CoinsMarketSection';
import DraftSettingsSection from '../components/leagueConfig/DraftSettingsSection';
import CalendarSection from '../components/leagueConfig/CalendarSection';
import SaveBar from '../components/SaveBar';
import ConfirmDialog from '../components/ConfirmDialog';
import Notice from '../components/Notice';

const DEFAULT_SETTINGS: LeagueSettings = {
  coinsPerWin: 100,
  coinsPerLoss: 50,
  priceTierS: 0,
  priceTierA: 0,
  priceTierB: 0,
  priceTierC: 0,
  priceTierD: 0,
  seasonStartDate: '',
  maxTeamSize: 20,
  tierPctS: 20,
  tierPctA: 20,
  tierPctB: 20,
  tierPctC: 20,
  tierPctD: 20,
  turnTimerSeconds: 0,
  stealWindowCloseDay: 4,
  stealWindowCloseTime: '23:59',
  swapWindowCloseDay: 5,
  swapWindowCloseTime: '16:00',
};

/** Fusiona lo que devuelve el backend con los defaults de UI, campo a campo. */
function withDefaults(settings: LeagueSettings | undefined): LeagueSettings {
  return {
    coinsPerWin: settings?.coinsPerWin ?? DEFAULT_SETTINGS.coinsPerWin,
    coinsPerLoss: settings?.coinsPerLoss ?? DEFAULT_SETTINGS.coinsPerLoss,
    priceTierS: settings?.priceTierS ?? DEFAULT_SETTINGS.priceTierS,
    priceTierA: settings?.priceTierA ?? DEFAULT_SETTINGS.priceTierA,
    priceTierB: settings?.priceTierB ?? DEFAULT_SETTINGS.priceTierB,
    priceTierC: settings?.priceTierC ?? DEFAULT_SETTINGS.priceTierC,
    priceTierD: settings?.priceTierD ?? DEFAULT_SETTINGS.priceTierD,
    seasonStartDate: settings?.seasonStartDate ?? DEFAULT_SETTINGS.seasonStartDate,
    maxTeamSize: settings?.maxTeamSize ?? DEFAULT_SETTINGS.maxTeamSize,
    tierPctS: settings?.tierPctS ?? DEFAULT_SETTINGS.tierPctS,
    tierPctA: settings?.tierPctA ?? DEFAULT_SETTINGS.tierPctA,
    tierPctB: settings?.tierPctB ?? DEFAULT_SETTINGS.tierPctB,
    tierPctC: settings?.tierPctC ?? DEFAULT_SETTINGS.tierPctC,
    tierPctD: settings?.tierPctD ?? DEFAULT_SETTINGS.tierPctD,
    turnTimerSeconds: settings?.turnTimerSeconds ?? DEFAULT_SETTINGS.turnTimerSeconds,
    stealWindowCloseDay: settings?.stealWindowCloseDay ?? DEFAULT_SETTINGS.stealWindowCloseDay,
    stealWindowCloseTime: settings?.stealWindowCloseTime ?? DEFAULT_SETTINGS.stealWindowCloseTime,
    swapWindowCloseDay: settings?.swapWindowCloseDay ?? DEFAULT_SETTINGS.swapWindowCloseDay,
    swapWindowCloseTime: settings?.swapWindowCloseTime ?? DEFAULT_SETTINGS.swapWindowCloseTime,
  };
}

const FIELD_LABELS: Record<keyof LeagueSettings, string> = {
  coinsPerWin: 'Monedas por victoria',
  coinsPerLoss: 'Monedas por derrota',
  priceTierS: 'Precio de mercado S',
  priceTierA: 'Precio de mercado A',
  priceTierB: 'Precio de mercado B',
  priceTierC: 'Precio de mercado C',
  priceTierD: 'Precio de mercado D',
  seasonStartDate: 'Fecha inicio temporada',
  maxTeamSize: 'Tamaño máx. equipo',
  tierPctS: '% tier S',
  tierPctA: '% tier A',
  tierPctB: '% tier B',
  tierPctC: '% tier C',
  tierPctD: '% tier D',
  turnTimerSeconds: 'Tiempo por turno (s)',
  stealWindowCloseDay: 'Día de cierre de robos',
  stealWindowCloseTime: 'Hora de cierre de robos',
  swapWindowCloseDay: 'Día de cierre de intercambios',
  swapWindowCloseTime: 'Hora de cierre de intercambios',
};

const FIELD_KEYS = Object.keys(FIELD_LABELS) as (keyof LeagueSettings)[];

const DAY_NAMES = ['', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];

/** Valor tal como se enseña en el resumen de cambios. */
function displayValue(key: keyof LeagueSettings, value: LeagueSettings[keyof LeagueSettings]): string | number {
  if (key === 'seasonStartDate') return (value as string | undefined) || '—';
  if (key === 'stealWindowCloseDay' || key === 'swapWindowCloseDay') return DAY_NAMES[Number(value)] ?? String(value);
  return (value as number | string | undefined) ?? 0;
}

export default function LeagueConfigPage() {
  const { leagueId } = useParams<{ leagueId: string }>();
  const username = useAuthStore((s) => s.username);
  const queryClient = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);

  const [form, setForm] = useState<LeagueSettings>(DEFAULT_SETTINGS);
  const [error, setError] = useState('');

  const { data: league } = useQuery({
    queryKey: ['league-detail', leagueId],
    queryFn: () => getLeagueDetail(leagueId!),
    enabled: !!leagueId,
  });

  const { data: draft } = useQuery({
    queryKey: ['draft-status', leagueId],
    queryFn: () => getDraftStatus(leagueId!),
    enabled: !!leagueId,
  });

  const { data: settings, isLoading } = useQuery({
    queryKey: ['league-settings', leagueId],
    queryFn: () => getLeagueSettings(leagueId!),
    enabled: !!leagueId,
  });

  // Sync local form state when settings load — estado editable derivado de datos async,
  // no hay alternativa pura (settings llega de useQuery).
  useEffect(() => {
    if (settings) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setForm(withDefaults(settings));
    }
  }, [settings]);

  const isAdmin = league?.members.some(
    (m) => m.username === username && m.leagueRole === 'ADMIN'
  );
  const draftInProgress = draft?.status === 'IN_PROGRESS';
  const draftPreparing = draft?.status === 'PENDING';
  // Antes de preparar el draft se enseña cuántos Pokémon caerían en cada tier (después, el reparto real
  // está en Preparar draft).
  const beforeDraft = draft === null || draft?.status === 'CANCELLED';
  const { data: pool } = useQuery({
    queryKey: ['closed-list', leagueId],
    queryFn: () => getClosedList(leagueId!),
    enabled: !!leagueId && beforeDraft,
    staleTime: 60_000,
  });
  const canEdit = isAdmin && !draftInProgress;
  const fieldsDisabled = !canEdit;

  const tierSum = form.tierPctS + form.tierPctA + form.tierPctB + form.tierPctC + form.tierPctD;
  const tierSumOk = tierSum === 100;

  function setField<K extends keyof LeagueSettings>(key: K, value: LeagueSettings[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  // ── Pending changes tracking ─────────────────────────────────────────────────
  const pendingChanges = useMemo(() => {
    if (!settings) return [];
    const saved = withDefaults(settings);
    return FIELD_KEYS.filter((key) => form[key] !== saved[key]).map((key) => ({
      label: FIELD_LABELS[key], old: displayValue(key, saved[key]), new: displayValue(key, form[key]),
    }));
  }, [settings, form]);

  const hasChanges = pendingChanges.length > 0;

  // ── Guard navegación con cambios sin guardar ──────────────────────────────────
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    if (hasChanges) {
      window.addEventListener('beforeunload', handler);
    }
    return () => window.removeEventListener('beforeunload', handler);
  }, [hasChanges]);

  // Cualquier salida (pestañas, menú, enlaces, atrás del navegador o de Android) pasa por aquí.
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) => hasChanges && currentLocation.pathname !== nextLocation.pathname,
  );

  // ── Mutations ────────────────────────────────────────────────────────────────
  const { mutate: save, isPending: saving } = useMutation({
    mutationFn: (payload: LeagueSettings) => updateLeagueSettings(leagueId!, payload),
    onSuccess: (_data, payload) => {
      setError('');
      addToast('success', 'Configuración guardada');
      // Lo guardado pasa a ser la referencia ya: sin esto, salir antes del refetch pediría confirmación
      queryClient.setQueryData(['league-settings', leagueId], payload);
      queryClient.invalidateQueries({ queryKey: ['league-settings', leagueId] });
      queryClient.invalidateQueries({ queryKey: ['closed-list', leagueId] });
    },
    onError: (err) => {
      addToast('error', extractErrorMessage(err, 'Error al guardar la configuración'));
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (form.coinsPerWin < 0 || form.coinsPerLoss < 0) {
      setError('Los valores deben ser >= 0');
      return;
    }
    if (form.priceTierS < 0 || form.priceTierA < 0 || form.priceTierB < 0 || form.priceTierC < 0 || form.priceTierD < 0) {
      setError('Los precios por tier deben ser >= 0');
      return;
    }
    if ((form.maxTeamSize ?? 0) < 10) {
      setError('El tamaño máximo del equipo debe ser >= 10');
      return;
    }
    if (!tierSumOk) {
      setError(`Los porcentajes de tier deben sumar 100 (suma actual: ${tierSum}%)`);
      return;
    }
    save({ ...form, seasonStartDate: form.seasonStartDate || undefined });
  };

  const handleCancel = () => {
    if (settings) {
      setForm(withDefaults(settings));
      setError('');
    }
  };

  return (
    <>
      <main className="page-content">
        <div className="section-header">
          <h1 className="page-title">⚙️ Configuración de liga</h1>
        </div>

        {isLoading && <SkeletonTable rows={5} />}

        {!isLoading && (
          <>
            {!isAdmin && (
              <Notice variant="info">
                Solo el admin puede modificar estos valores. Vista de solo lectura.
              </Notice>
            )}
            {isAdmin && draftInProgress && (
              <Notice variant="warning">
                El draft está en curso. No se puede modificar la configuración hasta que termine o se cancele.
              </Notice>
            )}
            {draftPreparing && (
              <Notice variant="info">
                Se está preparando el draft. La distribución de tiers solo se aplica al pulsar «Recalcular por BST»
                y el tamaño máximo del equipo cambia las rondas del draft.
                {isAdmin && <> <Link to={`/leagues/${leagueId}/draft/setup`}>Ir a Preparar draft</Link></>}
              </Notice>
            )}

            <form id="settings-form" onSubmit={handleSubmit} className="config-form animate-in">
              <CoinsMarketSection form={form} setField={setField} disabled={fieldsDisabled || saving} />
              <DraftSettingsSection
                form={form}
                setField={setField}
                disabled={fieldsDisabled || saving}
                tierSum={tierSum}
                tierSumOk={tierSumOk}
                poolSize={beforeDraft ? pool?.length : undefined}
              />
              <CalendarSection form={form} setField={setField} disabled={fieldsDisabled || saving} />
            </form>

            {canEdit && hasChanges && (
              <SaveBar
                summary={`${pendingChanges.length} cambio${pendingChanges.length !== 1 ? 's' : ''} sin guardar`}
                changes={pendingChanges}
                error={error || (!tierSumOk ? `Los porcentajes de tier deben sumar 100 (ahora ${tierSum} %)` : null)}
                saving={saving}
                saveLabel="Guardar cambios"
                formId="settings-form"
                canSave={tierSumOk}
                onDiscard={handleCancel}
              />
            )}
          </>
        )}
      </main>

      {blocker.state === 'blocked' && (
        <ConfirmDialog
          title="¿Salir sin guardar?"
          message={`Tienes ${pendingChanges.length} cambio${pendingChanges.length !== 1 ? 's' : ''} sin guardar. Si sales ahora se perderán.`}
          confirmLabel="Salir"
          pendingLabel="Saliendo..."
          pending={false}
          danger
          onConfirm={() => blocker.proceed()}
          onClose={() => blocker.reset()}
        />
      )}
    </>
  );
}
