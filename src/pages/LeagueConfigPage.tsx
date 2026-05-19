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
    }
  }, [settings]);

  const isAdmin = league?.members.some(
    (m) => m.username === username && m.leagueRole === 'ADMIN'
  );
  const draftCompleted = draft?.status === 'COMPLETED';
  const canEdit = isAdmin && draftCompleted;

  const { mutate: save, isPending: saving } = useMutation({
    mutationFn: (payload: LeagueSettings) => updateLeagueSettings(leagueId!, payload),
    onSuccess: () => {
      setError('');
      setSavedAt(Date.now());
      queryClient.invalidateQueries({ queryKey: ['league-settings', leagueId] });
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
    save({ coinsPerWin, coinsPerLoss });
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

        {!isLoading && !draftCompleted && (
          <div className="empty-state">
            <span className="empty-state-icon">⏳</span>
            <p>La configuración estará disponible cuando termine el draft.</p>
            <p style={{ marginTop: '0.4rem' }}>
              Estado actual del draft:{' '}
              <strong style={{ color: 'var(--text-2)' }}>
                {draft?.status ?? 'sin iniciar'}
              </strong>
            </p>
          </div>
        )}

        {!isLoading && draftCompleted && (
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
                    disabled={saving}
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
