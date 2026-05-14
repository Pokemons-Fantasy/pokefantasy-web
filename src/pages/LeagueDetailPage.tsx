import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { getLeagueDetail, addMember } from '../api/leagues';

export default function LeagueDetailPage() {
  const { leagueId } = useParams<{ leagueId: string }>();
  const username = useAuthStore((s) => s.username);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [newMember, setNewMember] = useState('');
  const [error, setError] = useState('');

  const { data: league, isLoading } = useQuery({
    queryKey: ['league-detail', leagueId],
    queryFn: () => getLeagueDetail(leagueId!),
    enabled: !!leagueId,
  });

  const isAdmin = league?.members.some(
    (m) => m.username === username && m.leagueRole === 'ADMIN'
  );

  const { mutate: add, isPending: adding } = useMutation({
    mutationFn: (target: string) => addMember(leagueId!, target),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['league-detail', leagueId] });
      setNewMember('');
      setError('');
    },
    onError: (err: Error) => setError(err.message ?? 'Error al añadir miembro'),
  });

  if (isLoading) return <div className="home-container"><p>Cargando liga...</p></div>;
  if (!league) return <div className="home-container"><p>Liga no encontrada</p></div>;

  return (
    <div className="home-container">
      <header>
        <h1 style={{ cursor: 'pointer' }} onClick={() => navigate('/leagues')}>PokeFantasy</h1>
        <div>
          <span>Hola, <strong>{username}</strong></span>
          <button onClick={logout}>Cerrar sesión</button>
        </div>
      </header>

      <main>
        <div className="pool-header">
          <div>
            <h2>{league.name}</h2>
            <p style={{ color: '#aaa' }}>Creada por <strong>{league.createdBy}</strong></p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button className="btn-primary" onClick={() => navigate(`/leagues/${leagueId}/pool`)}>
              Pool
            </button>
            <button className="btn-primary" onClick={() => navigate(`/leagues/${leagueId}/draft`)}>
              Draft
            </button>
          </div>
        </div>

        <h3 style={{ marginTop: '1.5rem' }}>Jugadores ({league.members.length})</h3>
        <div className="home-cards" style={{ marginTop: '0.75rem' }}>
          {league.members.map((m) => (
            <div key={m.username} className="home-card" style={{ cursor: 'default' }}>
              <h3>{m.username}</h3>
              <p>{m.leagueRole === 'ADMIN' ? 'Admin' : 'Jugador'}</p>
            </div>
          ))}
        </div>

        {isAdmin && (
          <div style={{ marginTop: '1.5rem' }}>
            <h3>Añadir jugador</h3>
            {error && <p className="error">{error}</p>}
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
              <input
                className="search-input"
                style={{ flex: 1, marginBottom: 0 }}
                type="text"
                placeholder="Nombre de usuario"
                value={newMember}
                onChange={(e) => setNewMember(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && newMember.trim()) add(newMember.trim()); }}
              />
              <button
                className="btn-primary"
                disabled={adding || !newMember.trim()}
                onClick={() => add(newMember.trim())}
              >
                Añadir
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
