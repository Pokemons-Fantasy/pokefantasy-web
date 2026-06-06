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

export default function LeagueConfigPage() {
  const { leagueId } = useParams<{ leagueId: string }>();
  const username = useAuthStore((s) => s.username);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);

  const [coinsPerWin, setCoinsPerWin] = useState<number>(100);
  const [coinsPerLoss, setCoinsPerLoss] = useState<number>(50);
  const [priceTierS, setPriceTierS] = useState<number>(0);
  const [priceTierA, setPriceTierA] = useState<number>(0);
  const [priceTierB, setPriceTierB] = useState<number>(0);
  const [priceTierC, setPriceTierC] = useState<number>(0);
  const [priceTierD, setPriceTierD] = useState<number>(0);
  const [seasonStartDate, setSeasonStartDate] = useState<string>('');
  const [maxTeamSize, setMaxTeamSize] = useState<number>(20);
  const [tierPctS, setTierPctS] = useState<number>(20);
  const [tierPctA, setTierPctA] = useState<number>(20);
  const [tierPctB, setTierPctB] = useState<number>(20);
  const [tierPctC, setTierPctC] = useState<number>(20);
  const [tierPctD, setTierPctD] = useState<number>(20);
  const [turnTimerSeconds, setTurnTimerSeconds] = useState<number>(0);
  const [stealWindowCloseDay, setStealWindowCloseDay] = useState<number>(4);
  const [stealWindowCloseTime, setStealWindowCloseTime] = useState<string>('23:59');
  const [swapWindowCloseDay, setSwapWindowCloseDay] = useState<number>(5);
  const [swapWindowCloseTime, setSwapWindowCloseTime] = useState<string>('16:00');
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

  // Sync local form state when settings load
  useEffect(() => {
    if (settings) {
      setCoinsPerWin(settings.coinsPerWin);
      setCoinsPerLoss(settings.coinsPerLoss);
      setPriceTierS(settings.priceTierS ?? 0);
      setPriceTierA(settings.priceTierA ?? 0);
      setPriceTierB(settings.priceTierB ?? 0);
      setPriceTierC(settings.priceTierC ?? 0);
      setPriceTierD(settings.priceTierD ?? 0);
      setSeasonStartDate(settings.seasonStartDate ?? '');
      setMaxTeamSize(settings.maxTeamSize ?? 20);
      setTierPctS(settings.tierPctS ?? 20);
      setTierPctA(settings.tierPctA ?? 20);
      setTierPctB(settings.tierPctB ?? 20);
      setTierPctC(settings.tierPctC ?? 20);
      setTierPctD(settings.tierPctD ?? 20);
      setTurnTimerSeconds(settings.turnTimerSeconds ?? 0);
      setStealWindowCloseDay(settings.stealWindowCloseDay ?? 4);
      setStealWindowCloseTime(settings.stealWindowCloseTime ?? '23:59');
      setSwapWindowCloseDay(settings.swapWindowCloseDay ?? 5);
      setSwapWindowCloseTime(settings.swapWindowCloseTime ?? '16:00');
    }
  }, [settings]);

  const isAdmin = league?.members.some(
    (m) => m.username === username && m.leagueRole === 'ADMIN'
  );
  const draftInProgress = draft?.status === 'IN_PROGRESS';
  const canEdit = isAdmin && !draftInProgress;

  const tierSum = tierPctS + tierPctA + tierPctB + tierPctC + tierPctD;
  const tierSumOk = tierSum === 100;

  // ── Pending changes tracking ─────────────────────────────────────────────────
  const pendingChanges = useMemo(() => {
    if (!settings) return [];
    type NumField = {
      key: keyof LeagueSettings;
      label: string;
      current: number;
      saved: number | undefined;
    };
    const numFields: NumField[] = [
      { key: 'coinsPerWin',  label: 'Monedas por victoria', current: coinsPerWin,  saved: settings.coinsPerWin },
      { key: 'coinsPerLoss', label: 'Monedas por derrota',  current: coinsPerLoss, saved: settings.coinsPerLoss },
      { key: 'priceTierS',   label: 'Precio tier S',        current: priceTierS,   saved: settings.priceTierS ?? 0 },
      { key: 'priceTierA',   label: 'Precio tier A',        current: priceTierA,   saved: settings.priceTierA ?? 0 },
      { key: 'priceTierB',   label: 'Precio tier B',        current: priceTierB,   saved: settings.priceTierB ?? 0 },
      { key: 'priceTierC',   label: 'Precio tier C',        current: priceTierC,   saved: settings.priceTierC ?? 0 },
      { key: 'priceTierD',   label: 'Precio tier D',        current: priceTierD,   saved: settings.priceTierD ?? 0 },
      { key: 'tierPctS',     label: '% tier S',             current: tierPctS,     saved: settings.tierPctS ?? 20 },
      { key: 'tierPctA',     label: '% tier A',             current: tierPctA,     saved: settings.tierPctA ?? 20 },
      { key: 'tierPctB',     label: '% tier B',             current: tierPctB,     saved: settings.tierPctB ?? 20 },
      { key: 'tierPctC',     label: '% tier C',             current: tierPctC,     saved: settings.tierPctC ?? 20 },
      { key: 'tierPctD',     label: '% tier D',             current: tierPctD,     saved: settings.tierPctD ?? 20 },
      { key: 'maxTeamSize',           label: 'Tamaño max equipo',          current: maxTeamSize,          saved: settings.maxTeamSize ?? 20 },
      { key: 'turnTimerSeconds',      label: 'Tiempo por turno (s)',       current: turnTimerSeconds,     saved: settings.turnTimerSeconds ?? 0 },
      { key: 'stealWindowCloseDay',   label: 'Día cierre ventana robo',    current: stealWindowCloseDay,  saved: settings.stealWindowCloseDay ?? 4 },
      { key: 'swapWindowCloseDay',    label: 'Día cierre ventana swap',    current: swapWindowCloseDay,   saved: settings.swapWindowCloseDay ?? 5 },
    ];

    const changes: Array<{ label: string; old: number | string; new: number | string }> = numFields
      .filter((f) => f.current !== f.saved)
      .map((f) => ({ label: f.label, old: f.saved ?? 0, new: f.current }));

    const savedDate = settings.seasonStartDate ?? '';
    if (seasonStartDate !== savedDate) {
      changes.push({ label: 'Fecha inicio temporada', old: savedDate || '—', new: seasonStartDate || '—' });
    }

    const savedStealTime = settings.stealWindowCloseTime ?? '23:59';
    if (stealWindowCloseTime !== savedStealTime) {
      changes.push({ label: 'Hora cierre robo', old: savedStealTime, new: stealWindowCloseTime });
    }
    const savedSwapTime = settings.swapWindowCloseTime ?? '16:00';
    if (swapWindowCloseTime !== savedSwapTime) {
      changes.push({ label: 'Hora cierre swap', old: savedSwapTime, new: swapWindowCloseTime });
    }

    return changes;
  }, [
    settings, coinsPerWin, coinsPerLoss,
    priceTierS, priceTierA, priceTierB, priceTierC, priceTierD,
    tierPctS, tierPctA, tierPctB, tierPctC, tierPctD,
    maxTeamSize, seasonStartDate, turnTimerSeconds,
    stealWindowCloseDay, stealWindowCloseTime, swapWindowCloseDay, swapWindowCloseTime,
  ]);

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
    if (coinsPerWin < 0 || coinsPerLoss < 0) {
      setError('Los valores deben ser >= 0');
      return;
    }
    if (priceTierS < 0 || priceTierA < 0 || priceTierB < 0 || priceTierC < 0 || priceTierD < 0) {
      setError('Los precios por tier deben ser >= 0');
      return;
    }
    if (maxTeamSize < 10) {
      setError('El tamaño máximo del equipo debe ser >= 10');
      return;
    }
    if (!tierSumOk) {
      setError(`Los porcentajes de tier deben sumar 100 (suma actual: ${tierSum}%)`);
      return;
    }
    save({
      coinsPerWin,
      coinsPerLoss,
      priceTierS,
      priceTierA,
      priceTierB,
      priceTierC,
      priceTierD,
      seasonStartDate: seasonStartDate || undefined,
      maxTeamSize,
      tierPctS,
      tierPctA,
      tierPctB,
      tierPctC,
      tierPctD,
      turnTimerSeconds,
      stealWindowCloseDay,
      stealWindowCloseTime,
      swapWindowCloseDay,
      swapWindowCloseTime,
    });
  };

  const handleCancel = () => {
    if (settings) {
      setCoinsPerWin(settings.coinsPerWin);
      setCoinsPerLoss(settings.coinsPerLoss);
      setPriceTierS(settings.priceTierS ?? 0);
      setPriceTierA(settings.priceTierA ?? 0);
      setPriceTierB(settings.priceTierB ?? 0);
      setPriceTierC(settings.priceTierC ?? 0);
      setPriceTierD(settings.priceTierD ?? 0);
      setSeasonStartDate(settings.seasonStartDate ?? '');
      setMaxTeamSize(settings.maxTeamSize ?? 20);
      setTierPctS(settings.tierPctS ?? 20);
      setTierPctA(settings.tierPctA ?? 20);
      setTierPctB(settings.tierPctB ?? 20);
      setTierPctC(settings.tierPctC ?? 20);
      setTierPctD(settings.tierPctD ?? 20);
      setTurnTimerSeconds(settings.turnTimerSeconds ?? 0);
      setStealWindowCloseDay(settings.stealWindowCloseDay ?? 4);
      setStealWindowCloseTime(settings.stealWindowCloseTime ?? '23:59');
      setSwapWindowCloseDay(settings.swapWindowCloseDay ?? 5);
      setSwapWindowCloseTime(settings.swapWindowCloseTime ?? '16:00');
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
                    value={coinsPerWin}
                    onChange={(e) => setCoinsPerWin(Number(e.target.value))}
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
                    value={coinsPerLoss}
                    onChange={(e) => setCoinsPerLoss(Number(e.target.value))}
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
                  const valueMap = { S: priceTierS, A: priceTierA, B: priceTierB, C: priceTierC, D: priceTierD };
                  const setterMap = { S: setPriceTierS, A: setPriceTierA, B: setPriceTierB, C: setPriceTierC, D: setPriceTierD };
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
                        value={valueMap[tier]}
                        onChange={(e) => setterMap[tier](Number(e.target.value))}
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
                  const pctMap = { S: tierPctS, A: tierPctA, B: tierPctB, C: tierPctC, D: tierPctD };
                  const setPctMap = { S: setTierPctS, A: setTierPctA, B: setTierPctB, C: setTierPctC, D: setTierPctD };
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
                        value={pctMap[tier]}
                        onChange={(e) => setPctMap[tier](Number(e.target.value))}
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
                    value={seasonStartDate}
                    onChange={(e) => setSeasonStartDate(e.target.value)}
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
                    value={maxTeamSize}
                    onChange={(e) => setMaxTeamSize(Number(e.target.value))}
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
                    value={turnTimerSeconds}
                    onChange={(e) => setTurnTimerSeconds(Number(e.target.value))}
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
                      value={stealWindowCloseDay}
                      onChange={(e) => setStealWindowCloseDay(Number(e.target.value))}
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
                      value={stealWindowCloseTime}
                      onChange={(e) => setStealWindowCloseTime(e.target.value)}
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
                      value={swapWindowCloseDay}
                      onChange={(e) => setSwapWindowCloseDay(Number(e.target.value))}
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
                      value={swapWindowCloseTime}
                      onChange={(e) => setSwapWindowCloseTime(e.target.value)}
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
