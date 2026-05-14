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

  if (isLoading) {
    return (
      <div className="page-wrapper">
        <header className="page-header">
          <div className="page-header-inner">
            <span className="logo" onClick={() => navigate('/leagues')}>PokeFantasy</span>
          </div>
        </header>
        <main className="page-content">
          <p style={{ color: 'var(--text-3)' }}>Cargando...</p>
        </main>
      </div>
    );
  }

  if (!league) {
    return (
      <div className="page-wrapper">
        <main className="page-content">
          <p className="error">Liga no encontrada</p>
        </main>
      </div>
    );
  }

  return (
    <div className="page-wrapper">
      <header className="page-header">
        <div className="page-header-inner">
          <span className="logo" onClick={() => navigate('/leagues')}>PokeFantasy</span>
          <div className="header-right">
            <span className="header-user">Hola, <strong>{username}</strong></span>
            <button className="btn-ghost" onClick={logout}>Cerrar sesión</button>
          </div>
        </div>
      </header>

      <main className="page-content">
        <div className="section-header">
          <div>
            <h1 className="page-title">{league.name}</h1>
            <p className="page-subtitle">Creada por {league.createdBy}</p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn-ghost" onClick={() => navigate(`/leagues/${leagueId}/pool`)}>
              Pool
            </button>
            <button className="btn-primary" onClick={() => navigate(`/leagues/${leagueId}/draft`)}>
              Draft
            </button>
          </div>
        </div>

        <p className="section-label">Jugadores ({league.members.length})</p>
        <div className="members-list">
          {league.members.map((m) => (
            <div key={m.username} className="member-row">
              <div className="member-avatar">{m.username[0]}</div>
              <div className="member-info">
                <div className="member-name">{m.username}</div>
                <div className={`member-role ${m.leagueRole === 'ADMIN' ? 'member-role-admin' : ''}`}>
                  {m.leagueRole === 'ADMIN' ? 'Admin' : 'Jugador'}
                </div>
              </div>
              {m.leagueRole === 'ADMIN' && (
                <span className="badge badge-yellow">Admin</span>
              )}
            </div>
          ))}
        </div>

        {isAdmin && (
          <>
            <hr className="divider" />
            <p className="section-label">Añadir jugador</p>
            {error && <p className="error" style={{ marginBottom: '0.75rem' }}>{error}</p>}
            <div className="inline-form">
              <input
                className="search-input"
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
                {adding ? 'Añadiendo...' : 'Añadir'}
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
