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
    },
    onError: (err: Error) => setError(err.message ?? 'Error al crear liga'),
  });

  return (
    <div className="home-container">
      <header>
        <h1 style={{ cursor: 'pointer' }} onClick={() => navigate('/')}>PokeFantasy</h1>
        <div>
          <span>Hola, <strong>{username}</strong></span>
          <button onClick={logout}>Cerrar sesión</button>
        </div>
      </header>

      <main>
        <div className="pool-header">
          <h2>Mis ligas</h2>
          <button className="btn-primary" onClick={() => setShowModal(true)}>Crear liga</button>
        </div>

        {error && <p className="error">{error}</p>}
        {isLoading && <p>Cargando ligas...</p>}

        <div className="home-cards">
          {leagues.map((league) => (
            <div key={league.id} className="home-card" onClick={() => navigate(`/leagues/${league.id}`)}>
              <h3>{league.name}</h3>
              <p>{league.memberCount} {league.memberCount === 1 ? 'jugador' : 'jugadores'}</p>
              <span className="home-card-cta">Entrar</span>
            </div>
          ))}
          {!isLoading && leagues.length === 0 && (
            <p style={{ color: '#aaa' }}>No estás en ninguna liga. ¡Crea una!</p>
          )}
        </div>
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
