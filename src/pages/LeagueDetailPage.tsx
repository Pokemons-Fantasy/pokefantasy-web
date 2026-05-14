import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { getLeagueDetail, addMember } from '../api/leagues';
import { getDraftStatus, startDraft } from '../api/pokemons';

export default function LeagueDetailPage() {
  const { leagueId } = useParams<{ leagueId: string }>();
  const username = useAuthStore((s) => s.username);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [newMember, setNewMember] = useState('');
  const [error, setError] = useState('');
  const [draftError, setDraftError] = useState('');
  const [turnOrder, setTurnOrder] = useState<string[]>([]);

  const { data: league, isLoading } = useQuery({
    queryKey: ['league-detail', leagueId],
    queryFn: () => getLeagueDetail(leagueId!),
    enabled: !!leagueId,
  });

  const { data: draft } = useQuery({
    queryKey: ['draft-status', leagueId],
    queryFn: () => getDraftStatus(leagueId!),
    enabled: !!leagueId,
  });

  useEffect(() => {
    if (league && turnOrder.length === 0) {
      setTurnOrder(league.members.map((m) => m.username));
    }
  }, [league]);

  const isAdmin = league?.members.some(
    (m) => m.username === username && m.leagueRole === 'ADMIN'
  );

  const draftActive = draft && (draft.status === 'IN_PROGRESS' || draft.status === 'COMPLETED');

  const { mutate: add, isPending: adding } = useMutation({
    mutationFn: (target: string) => addMember(leagueId!, target),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['league-detail', leagueId] });
      setNewMember('');
      setError('');
    },
    onError: (err: Error) => setError(err.message ?? 'Error al añadir miembro'),
  });

  const { mutate: initDraft, isPending: startingDraft } = useMutation({
    mutationFn: () => startDraft(leagueId!, turnOrder),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['draft-status', leagueId] });
      navigate(`/leagues/${leagueId}/draft`);
    },
    onError: (err: Error) => setDraftError(err.message ?? 'Error al iniciar draft'),
  });

  const moveUp = (i: number) => {
    if (i === 0) return;
    setTurnOrder((prev) => {
      const next = [...prev];
      [next[i - 1], next[i]] = [next[i], next[i - 1]];
      return next;
    });
  };

  const moveDown = (i: number) => {
    setTurnOrder((prev) => {
      if (i === prev.length - 1) return prev;
      const next = [...prev];
      [next[i], next[i + 1]] = [next[i + 1], next[i]];
      return next;
    });
  };

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
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            {draft && (
              <span className={`badge ${
                draft.status === 'IN_PROGRESS' ? 'badge-green' :
                draft.status === 'COMPLETED'   ? 'badge-gray'  : 'badge-yellow'
              }`}>
                {draft.status === 'IN_PROGRESS' ? 'Draft activo' :
                 draft.status === 'COMPLETED'   ? 'Draft completado' : 'Draft pendiente'}
              </span>
            )}
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

        {isAdmin && !draftActive && (
          <>
            <hr className="divider" />
            <p className="section-label">Iniciar draft</p>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-2)', marginBottom: '1rem' }}>
              Ordena los jugadores para definir el orden de turnos.
            </p>

            <div className="turn-order-list">
              {turnOrder.map((player, i) => (
                <div key={player} className="turn-order-item">
                  <span className="turn-order-num">{i + 1}</span>
                  <div className="member-avatar" style={{ width: 32, height: 32, fontSize: '0.8rem' }}>
                    {player[0]}
                  </div>
                  <span className="turn-order-name">{player}</span>
                  <div className="turn-order-arrows">
                    <button
                      className="arrow-btn"
                      onClick={() => moveUp(i)}
                      disabled={i === 0}
                      title="Subir"
                    >↑</button>
                    <button
                      className="arrow-btn"
                      onClick={() => moveDown(i)}
                      disabled={i === turnOrder.length - 1}
                      title="Bajar"
                    >↓</button>
                  </div>
                </div>
              ))}
            </div>

            {draftError && <p className="error" style={{ marginTop: '0.75rem' }}>{draftError}</p>}

            <button
              className="btn-primary"
              style={{ marginTop: '1rem' }}
              disabled={startingDraft || turnOrder.length === 0}
              onClick={() => initDraft()}
            >
              {startingDraft ? 'Iniciando...' : '⚡ Iniciar draft'}
            </button>
          </>
        )}

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
