import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { getMyLeagues, createLeague } from '../api/leagues';
import CreateLeagueModal from '../components/CreateLeagueModal';

export default function LeaguesPage() {
  const username = useAuthStore((s) => s.username);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState('');

  const { data: leagues = [], isLoading } = useQuery({
    queryKey: ['my-leagues'],
    queryFn: getMyLeagues,
  });

  const { mutate: create } = useMutation({
    mutationFn: createLeague,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-leagues'] });
      setShowModal(false);
      setError('');
    },
    onError: (err: Error) => setError(err.message ?? 'Error al crear liga'),
  });

  return (
    <div className="page-wrapper">
      <header className="page-header">
        <div className="page-header-inner">
          <span className="logo" onClick={() => navigate('/')}>PokeFantasy</span>
          <div className="header-right">
            <span className="header-user">Hola, <strong>{username}</strong></span>
            <button className="btn-ghost" onClick={logout}>Cerrar sesión</button>
          </div>
        </div>
      </header>

      <main className="page-content">
        <div className="section-header">
          <div>
            <h1 className="page-title">Mis ligas</h1>
            <p className="page-subtitle">{leagues.length} {leagues.length === 1 ? 'liga' : 'ligas'}</p>
          </div>
          <button className="btn-primary" onClick={() => setShowModal(true)}>+ Crear liga</button>
        </div>

        {error && <p className="error" style={{ marginBottom: '1rem' }}>{error}</p>}

        {isLoading && (
          <div className="loading-text">
            <span className="spinner" />
            Cargando ligas...
          </div>
        )}

        {!isLoading && (
          <div className="cards-grid stagger">
            {leagues.map((league) => (
              <div key={league.id} className="card" onClick={() => navigate(`/leagues/${league.id}`)}>
                <h3>{league.name}</h3>
                <div className="league-card-meta">
                  <span className={`league-card-dot${league.status === 'ACTIVE' ? ' active' : ''}`} />
                  <p style={{ margin: 0 }}>
                    {league.memberCount} {league.memberCount === 1 ? 'jugador' : 'jugadores'}
                  </p>
                </div>
                <span className="card-cta">Entrar →</span>
              </div>
            ))}
          </div>
        )}

        {!isLoading && leagues.length === 0 && (
          <div className="empty-state animate-in">
            <span className="empty-state-icon">🏆</span>
            <p style={{ color: 'var(--text-2)', fontWeight: 600 }}>Sin ligas todavía</p>
            <p>Crea una liga o pide a alguien que te añada.</p>
          </div>
        )}
      </main>

      {showModal && (
        <CreateLeagueModal
          onConfirm={(name) => create(name)}
          onClose={() => { setShowModal(false); setError(''); }}
        />
      )}
    </div>
  );
}
