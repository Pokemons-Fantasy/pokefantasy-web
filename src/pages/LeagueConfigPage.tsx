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
                <div className="config-field">
                  <label className="section-label" htmlFor="coinsPerWin">
                    Monedas por victoria
                  </label>
                  <input
                    id="coinsPerWin"
                    className="search-input"
                    type="number"
                    min={0}
                    step={1}
                    value={form.coinsPerWin}
                    onChange={(e) => setField('coinsPerWin', Number(e.target.value))}
                    disabled={!canEdit || saving}
                  />
                  <span className="config-hint">Lo que ganan los jugadores al ganar un combate.</span>
                </div>

                <div className="config-field">
                  <label className="section-label" htmlFor="coinsPerLoss">
                    Monedas por derrota
                  </label>
                  <input
                    id="coinsPerLoss"
                    className="search-input"
                    type="number"
                    min={0}
                    step={1}
                    value={form.coinsPerLoss}
                    onChange={(e) => setField('coinsPerLoss', Number(e.target.value))}
                    disabled={!canEdit || saving}
                  />
                  <span className="config-hint">Premio de consolación tras una derrota.</span>
                </div>

                <hr className="divider" style={{ margin: '1.5rem 0 1rem' }} />
                <p className="section-label" style={{ marginBottom: '1rem' }}>Precio por tier (monedas)</p>
                <span className="config-hint" style={{ marginBottom: '1rem', display: 'block' }}>
                  Coste en monedas de elegir un Pokémon de cada categoría.
                </span>

                {(['S', 'A', 'B', 'C', 'D'] as const).map((tier) => {
                  const key = `priceTier${tier}` as const;
                  return (
                    <div key={tier} className="config-field" style={{ flexDirection: 'row', alignItems: 'center', gap: '0.75rem' }}>
                      <span className={`tier-badge tier-badge-${tier.toLowerCase()}`} style={{ position: 'static', width: 28, height: 28, fontSize: '0.75rem', flexShrink: 0 }}>
                        {tier}
                      </span>
                      <input
                        className="search-input"
                        type="number"
                        min={0}
                        step={1}
                        value={form[key]}
                        onChange={(e) => setField(key, Number(e.target.value))}
                        disabled={!canEdit || saving}
                        style={{ flex: 1 }}
                      />
                    </div>
                  );
                })}

                <hr className="divider" style={{ margin: '1.5rem 0 1rem' }} />
                <p className="section-label" style={{ marginBottom: '0.35rem' }}>Distribución de tiers al inicio del draft</p>
                <span className="config-hint" style={{ marginBottom: '1rem', display: 'block' }}>
                  Porcentaje del pool que se asigna a cada tier. La suma debe ser exactamente 100%.
                  Se aplica cuando se inicia el draft.
                </span>

                {(['S', 'A', 'B', 'C', 'D'] as const).map((tier) => {
                  const key = `tierPct${tier}` as const;
                  return (
                    <div key={`pct-${tier}`} className="config-field" style={{ flexDirection: 'row', alignItems: 'center', gap: '0.75rem' }}>
                      <span className={`tier-badge tier-badge-${tier.toLowerCase()}`} style={{ position: 'static', width: 28, height: 28, fontSize: '0.75rem', flexShrink: 0 }}>
                        {tier}
                      </span>
                      <input
                        className="search-input"
                        type="number"
                        min={0}
                        max={100}
                        step={1}
                        value={form[key]}
                        onChange={(e) => setField(key, Number(e.target.value))}
                        disabled={!canEdit || saving}
                        style={{ flex: 1 }}
                      />
                      <span style={{ color: 'var(--text-3)', fontSize: '0.85rem', minWidth: 20 }}>%</span>
                    </div>
                  );
                })}

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  marginTop: '0.5rem',
                  marginBottom: '0.25rem',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  color: tierSumOk ? 'var(--green)' : 'var(--red)',
                }}>
                  {tierSumOk ? '✓' : '✗'} Suma: {tierSum}% {tierSumOk ? '— correcto' : '(debe ser 100%)'}
                </div>

                <hr className="divider" style={{ margin: '1.5rem 0 1rem' }} />
                <p className="section-label" style={{ marginBottom: '1rem' }}>Calendario de temporada</p>

                <div className="config-field">
                  <label className="section-label" htmlFor="seasonStartDate">
                    Fecha del primer fin de semana
                  </label>
                  <input
                    id="seasonStartDate"
                    className="search-input"
                    type="date"
                    value={form.seasonStartDate}
                    onChange={(e) => setField('seasonStartDate', e.target.value)}
                    disabled={!canEdit || saving}
                  />
                  <span className="config-hint">
                    Sábado de la jornada 1. El sistema asigna automáticamente una semana por jornada.
                  </span>
                </div>

                <div className="config-field">
                  <label className="section-label" htmlFor="maxTeamSize">
                    Tamaño máximo del equipo
                  </label>
                  <input
                    id="maxTeamSize"
                    className="search-input"
                    type="number"
                    min={10}
                    step={1}
                    value={form.maxTeamSize}
                    onChange={(e) => setField('maxTeamSize', Number(e.target.value))}
                    disabled={!canEdit || saving}
                  />
                  <span className="config-hint">
                    Máximo de Pokémon que puede tener un jugador post-draft (mínimo 10, por defecto 20).
                  </span>
                </div>

                <div className="config-field">
                  <label className="section-label" htmlFor="turnTimerSeconds">
                    Tiempo por turno (segundos, 0 = sin límite)
                  </label>
                  <input
                    id="turnTimerSeconds"
                    className="search-input"
                    type="number"
                    min={0}
                    step={1}
                    value={form.turnTimerSeconds}
                    onChange={(e) => setField('turnTimerSeconds', Number(e.target.value))}
                    disabled={!canEdit || saving}
                  />
                  <span className="config-hint">
                    Si el jugador en turno no elige en este tiempo, se asigna un Pokémon aleatorio. 0 desactiva el temporizador.
                  </span>
                </div>

                <hr className="divider" style={{ margin: '1.5rem 0 1rem' }} />
                <p className="section-label" style={{ marginBottom: '0.35rem' }}>Ventanas de tiempo</p>
                <span className="config-hint" style={{ marginBottom: '1rem', display: 'block' }}>
                  Día y hora en que cierra cada ventana dentro de la semana de jornada.
                </span>

                <div className="config-field">
                  <label className="section-label">Cierre ventana de robos</label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <select
                      className="search-input"
                      value={form.stealWindowCloseDay}
                      onChange={(e) => setField('stealWindowCloseDay', Number(e.target.value))}
                      disabled={!canEdit || saving}
                      style={{ flex: 1 }}
                    >
                      {[
                        { value: 1, label: 'Lunes' },
                        { value: 2, label: 'Martes' },
                        { value: 3, label: 'Miércoles' },
                        { value: 4, label: 'Jueves' },
                        { value: 5, label: 'Viernes' },
                        { value: 6, label: 'Sábado' },
                        { value: 7, label: 'Domingo' },
                      ].map((d) => (
                        <option key={d.value} value={d.value}>{d.label}</option>
                      ))}
                    </select>
                    <input
                      className="search-input"
                      type="time"
                      value={form.stealWindowCloseTime}
                      onChange={(e) => setField('stealWindowCloseTime', e.target.value)}
                      disabled={!canEdit || saving}
                      style={{ flex: 1 }}
                    />
                  </div>
                  <span className="config-hint">Por defecto: jueves 23:59</span>
                </div>

                <div className="config-field">
                  <label className="section-label">Cierre ventana de intercambios</label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <select
                      className="search-input"
                      value={form.swapWindowCloseDay}
                      onChange={(e) => setField('swapWindowCloseDay', Number(e.target.value))}
                      disabled={!canEdit || saving}
                      style={{ flex: 1 }}
                    >
                      {[
                        { value: 1, label: 'Lunes' },
                        { value: 2, label: 'Martes' },
                        { value: 3, label: 'Miércoles' },
                        { value: 4, label: 'Jueves' },
                        { value: 5, label: 'Viernes' },
                        { value: 6, label: 'Sábado' },
                        { value: 7, label: 'Domingo' },
                      ].map((d) => (
                        <option key={d.value} value={d.value}>{d.label}</option>
                      ))}
                    </select>
                    <input
                      className="search-input"
                      type="time"
                      value={form.swapWindowCloseTime}
                      onChange={(e) => setField('swapWindowCloseTime', e.target.value)}
                      disabled={!canEdit || saving}
                      style={{ flex: 1 }}
                    />
                  </div>
                  <span className="config-hint">Por defecto: viernes 16:00</span>
                </div>
              </form>

              {/* Right column — sticky sidebar */}
              <div className="settings-sidebar">
                {/* Unsaved changes indicator */}
                {hasChanges && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.6rem 0.9rem',
                    borderRadius: 'var(--radius-sm)',
                    background: 'rgba(251,191,36,0.07)',
                    border: '1px solid rgba(251,191,36,0.3)',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    color: '#fbbf24',
                  }}>
                    <span style={{ fontSize: '0.6rem' }}>●</span>
                    {pendingChanges.length} cambio{pendingChanges.length !== 1 ? 's' : ''} sin guardar
                  </div>
                )}

                {/* Pending changes list */}
                {pendingChanges.length > 0 && (
                  <div style={{
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius)',
                    padding: '0.75rem 1rem',
                  }}>
                    <p className="section-label" style={{ marginBottom: '0.6rem' }}>Cambios pendientes</p>
                    {pendingChanges.map((c) => (
                      <div
                        key={c.label}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'baseline',
                          gap: '0.5rem',
                          fontSize: '0.78rem',
                          marginBottom: '0.3rem',
                        }}
                      >
                        <span style={{ color: 'var(--text-2)' }}>{c.label}</span>
                        <span style={{ whiteSpace: 'nowrap', color: 'var(--text-3)', fontFamily: 'var(--font-mono, monospace)' }}>
                          {c.old} → <span style={{ color: 'var(--accent)' }}>{c.new}</span>
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Error / success */}
                {error && (
                  <p className="error" style={{ margin: 0 }}>{error}</p>
                )}
                {savedAt && !hasChanges && !error && (
                  <p className="success" style={{ margin: 0 }}>✓ Cambios guardados</p>
                )}

                {/* Action buttons */}
                {canEdit && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <button
                      type="submit"
                      form="settings-form"
                      className="btn-primary"
                      disabled={saving || !tierSumOk}
                    >
                      {saving ? 'Guardando...' : 'Guardar cambios'}
                    </button>
                    <button
                      type="button"
                      className="btn-ghost"
                      onClick={handleCancel}
                      disabled={saving}
                    >
                      Cancelar
                    </button>
                  </div>
                )}
              </div>

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
