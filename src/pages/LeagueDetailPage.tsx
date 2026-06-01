import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { getLeagueDetail, addMember, removeMember, generateInviteLink, searchUsers } from '../api/leagues';
import { useDebounce } from '../hooks/useDebounce';
import { getDraftStatus, startDraft } from '../api/pokemons';
import { useToastStore } from '../store/toastStore';
import { extractErrorMessage } from '../utils/errorMessage';
import { SkeletonTable } from '../components/SkeletonTable';
import PageHeader from '../components/PageHeader';

export default function LeagueDetailPage() {
  const { leagueId } = useParams<{ leagueId: string }>();
  const username = useAuthStore((s) => s.username);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);
  const [memberSearch, setMemberSearch] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [turnOrder, setTurnOrder] = useState<string[]>([]);
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);

  const debouncedSearch = useDebounce(memberSearch, 300);

  const { data: suggestions = [] } = useQuery({
    queryKey: ['user-search', debouncedSearch, leagueId],
    queryFn: () => searchUsers(debouncedSearch, leagueId!),
    enabled: debouncedSearch.length >= 2,
    staleTime: 30_000,
  });

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

  const adminCount = league?.members.filter((m) => m.leagueRole === 'ADMIN').length ?? 0;
  const isLastAdmin = isAdmin && adminCount === 1;

  const draftActive = draft && (draft.status === 'IN_PROGRESS' || draft.status === 'COMPLETED');

  const { mutate: add, isPending: adding } = useMutation({
    mutationFn: (target: string) => addMember(leagueId!, target),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['league-detail', leagueId] });
      setMemberSearch('');
    },
    onError: (err) => addToast('error', extractErrorMessage(err, 'Error al añadir miembro')),
  });

  const { mutate: generateInvite } = useMutation({
    mutationFn: () => generateInviteLink(leagueId!),
    onSuccess: ({ token }) => {
      const url = `${window.location.origin}/invite/${token}`;
      navigator.clipboard.writeText(url);
      addToast('success', 'Link de invitación copiado (válido 48 h)');
    },
    onError: (err) => addToast('error', extractErrorMessage(err, 'Error al generar link')),
  });

  const { mutate: remove, isPending: removing } = useMutation({
    mutationFn: (target: string) => removeMember(leagueId!, target),
    onSuccess: (_data, target) => {
      setConfirmRemove(null);
      if (target === username) {
        navigate('/leagues');
      } else {
        queryClient.invalidateQueries({ queryKey: ['league-detail', leagueId] });
        setTurnOrder((prev) => prev.filter((u) => u !== target));
      }
    },
    onError: () => setConfirmRemove(null),
  });

  const { mutate: initDraft, isPending: startingDraft } = useMutation({
    mutationFn: () => startDraft(leagueId!, turnOrder),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['draft-status', leagueId] });
      queryClient.invalidateQueries({ queryKey: ['closed-list', leagueId] });
      navigate(`/leagues/${leagueId}/draft`);
    },
    onError: (err) => addToast('error', extractErrorMessage(err, 'Error al iniciar draft')),
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
        <PageHeader />
        <main className="page-content">
          <SkeletonTable rows={4} />
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
      <PageHeader left={
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button className="btn-back" onClick={() => navigate('/leagues')}>← Mis ligas</button>
          <span className="logo" onClick={() => navigate('/leagues')}>PokeFantasy</span>
        </div>
      } />

      <main className="page-content">
        <div className="section-header">
          <div>
            <h1 className="page-title">{league.name}</h1>
            <p className="page-subtitle">Creada por {league.createdBy}</p>
          </div>
          <div className="section-actions">
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
            <button className="btn-ghost" onClick={() => navigate(`/leagues/${leagueId}/draft`)}>
              Draft
            </button>
            {(draft?.picks?.length ?? 0) > 0 && (
              <button className="btn-primary" onClick={() => navigate(`/leagues/${leagueId}/teams`)}>
                Equipos
              </button>
            )}
            {draft?.status === 'COMPLETED' && (
              <>
                <button className="btn-ghost" onClick={() => navigate(`/leagues/${leagueId}/standings`)}>
                  🏆 Clasificación
                </button>
                <button className="btn-ghost" onClick={() => navigate(`/leagues/${leagueId}/schedule`)}>
                  📅 Calendario
                </button>
                <button className="btn-ghost" onClick={() => navigate(`/leagues/${leagueId}/activity`)}>
                  ⚡ Actividad
                </button>
                <button className="btn-secondary" onClick={() => navigate(`/leagues/${leagueId}/config`)}>
                  ⚙️ Configuración
                </button>
                {isAdmin && (
                  <button className="btn-secondary" onClick={() => navigate(`/leagues/${leagueId}/tiers`)}>
                    🔧 Gestionar tiers
                  </button>
                )}
              </>
            )}
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
              {m.username === username && (
                <button
                  className="btn-danger"
                  style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem' }}
                  disabled={isLastAdmin}
                  title={isLastAdmin ? 'No puedes salir si eres el único admin' : 'Salir de la liga'}
                  onClick={() => setConfirmRemove(m.username)}
                >
                  Salir
                </button>
              )}
              {isAdmin && m.username !== username && (
                <button
                  className="btn-danger"
                  style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem' }}
                  onClick={() => setConfirmRemove(m.username)}
                >
                  Expulsar
                </button>
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
            <div style={{ position: 'relative' }}>
              <div className="inline-form">
                <input
                  className="search-input"
                  type="text"
                  placeholder="Nombre de usuario"
                  value={memberSearch}
                  onChange={(e) => { setMemberSearch(e.target.value); setShowSuggestions(true); }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && memberSearch.trim()) {
                      add(memberSearch.trim());
                      setShowSuggestions(false);
                    }
                  }}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                />
                <button
                  className="btn-primary"
                  disabled={adding || !memberSearch.trim()}
                  onClick={() => { add(memberSearch.trim()); setShowSuggestions(false); }}
                >
                  {adding ? 'Añadiendo...' : 'Añadir'}
                </button>
              </div>
              {showSuggestions && suggestions.length > 0 && (
                <ul className="autocomplete-dropdown">
                  {suggestions.map((username) => (
                    <li
                      key={username}
                      onMouseDown={() => {
                        setMemberSearch(username);
                        add(username);
                        setShowSuggestions(false);
                      }}
                    >
                      {username}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <button
              className="btn-ghost"
              style={{ marginTop: '0.5rem', width: '100%' }}
              onClick={() => generateInvite()}
            >
              🔗 Copiar link de invitación
            </button>
          </>
        )}
      </main>

      {confirmRemove && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>
              {confirmRemove === username ? '¿Salir de la liga?' : `¿Expulsar a ${confirmRemove}?`}
            </h2>
            <p style={{ color: 'var(--text-2)', fontSize: '0.9rem' }}>
              {confirmRemove === username
                ? 'Perderás todos tus picks del draft. Esta acción no se puede deshacer.'
                : `${confirmRemove} será eliminado de la liga y perderá todos sus picks del draft.`}
            </p>
            <div className="modal-actions">
              <button className="btn-ghost" onClick={() => setConfirmRemove(null)} disabled={removing}>
                Cancelar
              </button>
              <button className="btn-danger" onClick={() => remove(confirmRemove)} disabled={removing}>
                {removing ? 'Eliminando...' : confirmRemove === username ? 'Salir' : 'Expulsar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
