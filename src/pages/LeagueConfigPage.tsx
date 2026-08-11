import { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import {
  getLeagueDetail,
  getLeagueSettings,
  updateLeagueSettings,
  type LeagueSettings,
} from '../api/leagues';
import { getDraftStatus } from '../api/pokemons';
import { useToastStore } from '../store/toastStore';
import { extractErrorMessage } from '../utils/errorMessage';
import { SkeletonTable } from '../components/SkeletonTable';
import PageHeader from '../components/PageHeader';
import GeneralSettingsSection from '../components/leagueConfig/GeneralSettingsSection';
import TierPricesSection from '../components/leagueConfig/TierPricesSection';
import TierDistributionSection from '../components/leagueConfig/TierDistributionSection';
import ScheduleSection from '../components/leagueConfig/ScheduleSection';
import TimeWindowsSection from '../components/leagueConfig/TimeWindowsSection';
import PendingChangesSidebar from '../components/leagueConfig/PendingChangesSidebar';

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
  priceTierS: 'Precio tier S',
  priceTierA: 'Precio tier A',
  priceTierB: 'Precio tier B',
  priceTierC: 'Precio tier C',
  priceTierD: 'Precio tier D',
  seasonStartDate: 'Fecha inicio temporada',
  maxTeamSize: 'Tamaño máx. equipo',
  tierPctS: '% tier S',
  tierPctA: '% tier A',
  tierPctB: '% tier B',
  tierPctC: '% tier C',
  tierPctD: '% tier D',
  turnTimerSeconds: 'Tiempo por turno (s)',
  stealWindowCloseDay: 'Día cierre ventana robo',
  stealWindowCloseTime: 'Hora cierre robo',
  swapWindowCloseDay: 'Día cierre ventana swap',
  swapWindowCloseTime: 'Hora cierre swap',
};

const FIELD_KEYS = Object.keys(FIELD_LABELS) as (keyof LeagueSettings)[];

export default function LeagueConfigPage() {
  const { leagueId } = useParams<{ leagueId: string }>();
  const username = useAuthStore((s) => s.username);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);

  const [form, setForm] = useState<LeagueSettings>(DEFAULT_SETTINGS);
  const [error, setError] = useState('');
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [leaveTarget, setLeaveTarget] = useState<string | null>(null);

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
    return FIELD_KEYS.filter((key) => form[key] !== saved[key]).map((key) => {
      const oldVal = saved[key];
      const newVal = form[key];
      if (key === 'seasonStartDate') {
        return { label: FIELD_LABELS[key], old: oldVal || '—', new: newVal || '—' };
      }
      return { label: FIELD_LABELS[key], old: oldVal ?? 0, new: newVal ?? 0 };
    });
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

  const guardedNavigate = (target: string) => {
    if (hasChanges) {
      setLeaveTarget(target);
    } else {
      navigate(target);
    }
  };

  // ── Mutations ────────────────────────────────────────────────────────────────
  const { mutate: save, isPending: saving } = useMutation({
    mutationFn: (payload: LeagueSettings) => updateLeagueSettings(leagueId!, payload),
    onSuccess: () => {
      setError('');
      setSavedAt(Date.now());
      queryClient.invalidateQueries({ queryKey: ['league-settings', leagueId] });
      queryClient.invalidateQueries({ queryKey: ['closed-list', leagueId] });
    },
    onError: (err) => {
      addToast('error', extractErrorMessage(err, 'Error al guardar la configuración'));
      setSavedAt(null);
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
      setSavedAt(null);
    }
  };

  return (
    <div className="page-wrapper">
      <PageHeader left={
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button className="btn-back" onClick={() => guardedNavigate(`/leagues/${leagueId}`)}>← Liga</button>
          <span className="logo" onClick={() => guardedNavigate('/leagues')}>PokeFantasy</span>
        </div>
      } />

      <main className="page-content">
        <div className="section-header" style={{ marginBottom: '1.5rem' }}>
          <div>
            <h1 className="page-title">⚙️ Configuración de liga</h1>
            {league && <p className="page-subtitle">{league.name}</p>}
          </div>
        </div>

        {isLoading && <SkeletonTable rows={5} />}

        {!isLoading && (
          <>
            {!isAdmin && (
              <div className="my-turn-banner" style={{
                background: 'rgba(129,140,248,0.07)',
                borderColor: 'rgba(129,140,248,0.25)',
                color: 'var(--blue)',
                marginBottom: '1rem',
              }}>
                Solo el admin puede modificar estos valores. Vista de solo lectura.
              </div>
            )}
            {isAdmin && draftInProgress && (
              <div className="my-turn-banner" style={{
                background: 'rgba(251,191,36,0.07)',
                borderColor: 'rgba(251,191,36,0.25)',
                color: 'var(--yellow, #f59e0b)',
                marginBottom: '1rem',
              }}>
                El draft está en curso. No se puede modificar la configuración hasta que termine o se cancele.
              </div>
            )}

            {/* ── Two-column layout ─────────────────────────────────────────── */}
            <div className="settings-two-col">

              {/* Left column — form fields */}
              <form
                id="settings-form"
                onSubmit={handleSubmit}
                className="config-form animate-in"
                style={{ maxWidth: 'none' }}
              >
                <GeneralSettingsSection form={form} setField={setField} disabled={fieldsDisabled || saving} />
                <TierPricesSection form={form} setField={setField} disabled={fieldsDisabled || saving} />
                <TierDistributionSection
                  form={form}
                  setField={setField}
                  disabled={fieldsDisabled || saving}
                  tierSum={tierSum}
                  tierSumOk={tierSumOk}
                />
                <ScheduleSection form={form} setField={setField} disabled={fieldsDisabled || saving} />
                <TimeWindowsSection form={form} setField={setField} disabled={fieldsDisabled || saving} />
              </form>

              {/* Right column — sticky sidebar */}
              <PendingChangesSidebar
                pendingChanges={pendingChanges}
                error={error}
                savedAt={savedAt}
                canEdit={canEdit}
                saving={saving}
                tierSumOk={tierSumOk}
                onCancel={handleCancel}
              />

            </div>
          </>
        )}
      </main>

      {leaveTarget && (
        <div className="modal-overlay" onClick={() => setLeaveTarget(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">Cambios sin guardar</h2>
            <p style={{ color: 'var(--text-2)', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
              Tienes {pendingChanges.length} cambio{pendingChanges.length !== 1 ? 's' : ''} sin guardar.
              Si sales ahora se perderán.
            </p>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setLeaveTarget(null)}>
                Seguir editando
              </button>
              <button className="btn-danger" onClick={() => navigate(leaveTarget)}>
                Descartar cambios
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
