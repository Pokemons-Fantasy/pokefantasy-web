import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { Clipboard } from '@capacitor/clipboard';
import { Capacitor } from '@capacitor/core';
import { useAuthStore } from '../store/authStore';
import { getLeagueDetail, addMember, removeMember, generateInviteLink, searchUsers } from '../api/leagues';
import { useDebounce } from '../hooks/useDebounce';
import { getDraftStatus, startDraft } from '../api/pokemons';
import { useToastStore } from '../store/toastStore';
import { extractErrorMessage } from '../utils/errorMessage';
import { inviteUrl } from '../utils/invite';
import { SkeletonTable } from '../components/SkeletonTable';
import UserAvatar from '../components/avatar/UserAvatar';

export default function LeagueMembersPage() {
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
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sin acción inmediata (roadmap-frontend.md)
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
      Clipboard.write({ string: inviteUrl(token, Capacitor.isNativePlatform(), window.location.origin) });
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

  if (isLoading || !league) {
    // El layout ya muestra "Liga no encontrada" si la liga no carga.
    return <main className="page-content"><SkeletonTable rows={4} /></main>;
  }

  return (
    <>
      <main className="page-content">
        <div className="section-header">
          <div>
            <h1 className="page-title">Miembros</h1>
            <p className="page-subtitle">Creada por {league.createdBy}</p>
          </div>
        </div>

        <p className="section-label">Jugadores ({league.members.length})</p>
        <div className="members-list">
          {league.members.map((m) => (
            <div key={m.username} className="member-row">
              <UserAvatar username={m.username} />
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
                  <UserAvatar username={player} size={32} />
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
            {/* El backend no admite nuevos miembros por link una vez empezado el draft */}
            {!draftActive && (
              <button
                className="btn-ghost"
                style={{ marginTop: '0.5rem', width: '100%' }}
                onClick={() => generateInvite()}
              >
                🔗 Copiar link de invitación
              </button>
            )}
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
    </>
  );
}
