import { useEffect, useState } from 'react';
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

export default function LeagueConfigPage() {
  const { leagueId } = useParams<{ leagueId: string }>();
  const username = useAuthStore((s) => s.username);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

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
  const [error, setError] = useState('');
  const [savedAt, setSavedAt] = useState<number | null>(null);

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
    }
  }, [settings]);

  const isAdmin = league?.members.some(
    (m) => m.username === username && m.leagueRole === 'ADMIN'
  );
  const draftInProgress = draft?.status === 'IN_PROGRESS';
  const canEdit = isAdmin && !draftInProgress;

  const tierSum = tierPctS + tierPctA + tierPctB + tierPctC + tierPctD;
  const tierSumOk = tierSum === 100;

  const { mutate: save, isPending: saving } = useMutation({
    mutationFn: (payload: LeagueSettings) => updateLeagueSettings(leagueId!, payload),
    onSuccess: () => {
      setError('');
      setSavedAt(Date.now());
      queryClient.invalidateQueries({ queryKey: ['league-settings', leagueId] });
      queryClient.invalidateQueries({ queryKey: ['closed-list', leagueId] });
    },
    onError: (err: Error) => {
      setError(err.message ?? 'Error al guardar la configuración');
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
    });
  };

  return (
    <div className="page-wrapper">
      <header className="page-header">
        <div className="page-header-inner">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button className="btn-back" onClick={() => navigate(`/leagues/${leagueId}`)}>
              ← Liga
            </button>
            <span className="logo" onClick={() => navigate('/leagues')}>PokeFantasy</span>
          </div>
          <div className="header-right">
            <span className="header-user">Hola, <strong>{username}</strong></span>
            <button className="btn-ghost" onClick={logout}>Cerrar sesión</button>
          </div>
        </div>
      </header>

      <main className="page-content">
        <div className="section-header">
          <div>
            <h1 className="page-title">⚙️ Configuración de liga</h1>
            {league && <p className="page-subtitle">{league.name}</p>}
          </div>
        </div>

        {isLoading && <p style={{ color: 'var(--text-3)' }}>Cargando...</p>}

        {!isLoading && (
          <>
            {!isAdmin && (
              <div className="my-turn-banner" style={{
                background: 'rgba(129,140,248,0.07)',
                borderColor: 'rgba(129,140,248,0.25)',
                color: 'var(--blue)',
              }}>
                Solo el admin puede modificar estos valores. Vista de solo lectura.
              </div>
            )}
            {isAdmin && draftInProgress && (
              <div className="my-turn-banner" style={{
                background: 'rgba(251,191,36,0.07)',
                borderColor: 'rgba(251,191,36,0.25)',
                color: 'var(--yellow, #f59e0b)',
              }}>
                El draft está en curso. No se puede modificar la configuración hasta que termine o se cancele.
              </div>
            )}

            <form onSubmit={handleSubmit} className="config-form animate-in">
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

              {error && <p className="error">{error}</p>}
              {savedAt && !error && (
                <p className="success">✓ Cambios guardados</p>
              )}

              {canEdit && (
                <div className="modal-actions">
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={() => {
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
                        setError('');
                        setSavedAt(null);
                      }
                    }}
                    disabled={saving}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={saving || !tierSumOk}
                  >
                    {saving ? 'Guardando...' : 'Guardar'}
                  </button>
                </div>
              )}
            </form>
          </>
        )}
      </main>
    </div>
  );
}
