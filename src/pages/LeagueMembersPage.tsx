import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Clipboard } from '@capacitor/clipboard';
import { Capacitor } from '@capacitor/core';
import { useAuthStore } from '../store/authStore';
import {
  getLeagueDetail, addMember, removeMember, promoteToAdmin, generateInviteLink, searchUsers,
} from '../api/leagues';
import { useDebounce } from '../hooks/useDebounce';
import { getDraftStatus, prepareDraft } from '../api/pokemons';
import type { DraftStatus } from '../api/pokemons';
import { useToastStore } from '../store/toastStore';
import { extractErrorMessage } from '../utils/errorMessage';
import { inviteUrl } from '../utils/invite';
import { SkeletonTable } from '../components/SkeletonTable';
import UserAvatar from '../components/avatar/UserAvatar';
import MemberMenu from '../components/league/MemberMenu';
import type { MemberAction } from '../components/league/MemberMenu';
import ConfirmDialog from '../components/ConfirmDialog';

type MemberActionKind = 'leave' | 'remove' | 'promote';

interface PendingAction {
  kind: MemberActionKind;
  username: string;
}

/** Textos de la confirmación. Salir o expulsar solo quita picks con el draft en marcha (el back solo los
 *  toca entonces); con la temporada empezada el equipo y los partidos se quedan. */
function confirmCopy({ kind, username }: PendingAction, draftStatus: DraftStatus['status'] | undefined) {
  const drafting = draftStatus === 'PENDING' || draftStatus === 'IN_PROGRESS';
  const season = draftStatus === 'COMPLETED';
  if (kind === 'promote') {
    return {
      title: `¿Hacer admin a ${username}?`,
      message: 'Podrá gestionar los miembros, la configuración y el draft, igual que tú. Desde la app no se puede deshacer.',
      confirmLabel: 'Hacer admin',
      pendingLabel: 'Guardando...',
      danger: false,
    };
  }
  if (kind === 'leave') {
    const effect = drafting ? 'Perderás los picks que llevas en el draft. '
      : season ? 'Tu equipo y tus partidos se quedan en la liga. ' : '';
    return {
      title: '¿Salir de la liga?',
      message: `${effect}Solo podrás volver si un admin te añade.`,
      confirmLabel: 'Salir',
      pendingLabel: 'Saliendo...',
      danger: true,
    };
  }
  const effect = drafting ? `${username} perderá los picks que lleva en el draft. `
    : season ? 'Su equipo y sus partidos se quedan en la liga. ' : '';
  return {
    title: `¿Expulsar a ${username}?`,
    message: `${effect}Dejará de ver la liga hasta que un admin le vuelva a añadir.`,
    confirmLabel: 'Expulsar',
    pendingLabel: 'Expulsando...',
    danger: true,
  };
}

export default function LeagueMembersPage() {
  const { leagueId } = useParams<{ leagueId: string }>();
  const username = useAuthStore((s) => s.username);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);
  const [memberSearch, setMemberSearch] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);

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
      addToast('success', 'Enlace de invitación copiado (válido 48 h)');
    },
    onError: (err) => addToast('error', extractErrorMessage(err, 'Error al generar el enlace')),
  });

  const { mutate: remove, isPending: removing } = useMutation({
    mutationFn: (target: string) => removeMember(leagueId!, target),
    onSuccess: (_data, target) => {
      setPendingAction(null);
      if (target === username) {
        queryClient.invalidateQueries({ queryKey: ['my-leagues'] });
        navigate('/leagues');
      } else {
        queryClient.invalidateQueries({ queryKey: ['league-detail', leagueId] });
        addToast('success', `${target} ya no está en la liga`);
      }
    },
    onError: (err, target) => {
      setPendingAction(null);
      addToast('error', extractErrorMessage(err, target === username ? 'No se pudo salir de la liga' : `No se pudo expulsar a ${target}`));
    },
  });

  const { mutate: promote, isPending: promoting } = useMutation({
    mutationFn: (target: string) => promoteToAdmin(leagueId!, target),
    onSuccess: (_data, target) => {
      setPendingAction(null);
      queryClient.invalidateQueries({ queryKey: ['league-detail', leagueId] });
      addToast('success', `${target} ya es admin`);
    },
    onError: (err, target) => {
      setPendingAction(null);
      addToast('error', extractErrorMessage(err, `No se pudo hacer admin a ${target}`));
    },
  });

  const draftInSetup = draft?.status === 'PENDING';

  const { mutate: prepare, isPending: preparing } = useMutation({
    mutationFn: () => prepareDraft(leagueId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['draft-status', leagueId] });
      queryClient.invalidateQueries({ queryKey: ['closed-list', leagueId] });
      navigate(`/leagues/${leagueId}/draft/setup`);
    },
    onError: (err) => addToast('error', extractErrorMessage(err, 'No se pudo preparar el draft')),
  });

  const confirmPending = () => {
    if (!pendingAction) return;
    if (pendingAction.kind === 'promote') promote(pendingAction.username);
    else remove(pendingAction.username);
  };

  /** Acciones del menú ⋯ de cada fila según quién mira. */
  const rowMenu = (target: string, targetIsAdmin: boolean): { actions: MemberAction[]; note?: string } => {
    const ask = (kind: MemberActionKind) => () => setPendingAction({ kind, username: target });
    if (target === username) {
      return isLastAdmin
        ? { actions: [], note: 'Eres el único admin: para salir, haz admin antes a otro jugador.' }
        : { actions: [{ label: 'Salir de la liga', onSelect: ask('leave'), danger: true }] };
    }
    if (!isAdmin) return { actions: [] };
    return {
      actions: [
        ...(targetIsAdmin ? [] : [{ label: 'Hacer admin', onSelect: ask('promote') }]),
        { label: 'Expulsar', onSelect: ask('remove'), danger: true },
      ],
    };
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
          {league.members.map((m) => {
            const memberIsAdmin = m.leagueRole === 'ADMIN';
            const menu = rowMenu(m.username, memberIsAdmin);
            return (
              <div key={m.username} className="member-row">
                <UserAvatar username={m.username} />
                <div className="member-info">
                  <span className="member-name">{m.username}</span>
                  {m.username === username && <span className="badge badge-gray">Tú</span>}
                  {memberIsAdmin && <span className="badge badge-yellow">Admin</span>}
                </div>
                <MemberMenu username={m.username} actions={menu.actions} note={menu.note} />
              </div>
            );
          })}
        </div>

        {isAdmin && !draftActive && (
          <>
            <hr className="divider" />
            <p className="section-label">Draft</p>
            {draftInSetup ? (
              <Link className="btn-primary turn-order-start" to={`/leagues/${leagueId}/draft/setup`}>
                Continuar la preparación
              </Link>
            ) : (
              <>
                <p className="turn-order-hint">
                  Reparte los tiers, pon precios y presupuesto, y ordena los turnos. Al prepararlo se cierran las nominaciones.
                </p>
                <button className="btn-primary turn-order-start" disabled={preparing} onClick={() => prepare()}>
                  {preparing ? 'Preparando...' : 'Preparar draft'}
                </button>
              </>
            )}
          </>
        )}

        {isAdmin && (
          <>
            <hr className="divider" />
            <p className="section-label">Añadir jugador</p>
            <div className="add-member">
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
                className="btn-ghost invite-button"
                onClick={() => generateInvite()}
              >
                🔗 Copiar enlace de invitación
              </button>
            )}
          </>
        )}
      </main>

      {pendingAction && (
        <ConfirmDialog
          {...confirmCopy(pendingAction, draft?.status)}
          pending={removing || promoting}
          onConfirm={confirmPending}
          onClose={() => setPendingAction(null)}
        />
      )}
    </>
  );
}
