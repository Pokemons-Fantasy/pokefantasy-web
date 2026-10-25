import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import { Navigate } from 'react-router-dom';
import { getMe } from '../api/auth';
import { deleteUser, removeAvatar, renameLeague, searchLeagues, searchUsers, type AdminLeague, type AdminUser } from '../api/admin';
import PageHeader from '../components/PageHeader';
import ConfirmDialog from '../components/ConfirmDialog';
import UserAvatar from '../components/avatar/UserAvatar';
import { SkeletonGrid } from '../components/SkeletonGrid';
import { useDebounce } from '../hooks/useDebounce';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { useToastStore } from '../store/toastStore';
import { extractErrorMessage } from '../utils/errorMessage';
import { leagueNameError } from '../utils/leagueName';

/** Mínimo de caracteres para buscar (como el backend). */
const MIN_QUERY = 2;

type PendingAction =
  | { kind: 'photo'; user: AdminUser }
  | { kind: 'delete'; user: AdminUser };

/** Panel de moderación (L5): solo el rol global ADMIN. El backend lo exige igualmente en /v1/admin. */
export default function AdminPage() {
  const { data: me, isLoading } = useQuery({ queryKey: ['me'], queryFn: getMe, staleTime: 5 * 60_000 });
  const [userQuery, setUserQuery] = useState('');
  const [leagueQuery, setLeagueQuery] = useState('');
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [renaming, setRenaming] = useState<AdminLeague | null>(null);
  const users = useDebounce(userQuery.trim(), 300);
  const leagues = useDebounce(leagueQuery.trim(), 300);
  const queryClient = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);
  const isAdmin = me?.admin === true;

  const usersResult = useQuery({
    queryKey: ['admin-users', users],
    queryFn: () => searchUsers(users),
    enabled: isAdmin && users.length >= MIN_QUERY,
    placeholderData: keepPreviousData,
  });
  const leaguesResult = useQuery({
    queryKey: ['admin-leagues', leagues],
    queryFn: () => searchLeagues(leagues),
    enabled: isAdmin && leagues.length >= MIN_QUERY,
    placeholderData: keepPreviousData,
  });

  const userAction = useMutation({
    mutationFn: (action: PendingAction) =>
      action.kind === 'photo' ? removeAvatar(action.user.username) : deleteUser(action.user.username),
    onSuccess: (_, action) => {
      addToast('success', action.kind === 'photo'
        ? `Foto de ${action.user.username} quitada`
        : `Cuenta de ${action.user.username} borrada`);
      setPending(null);
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-leagues'] });
    },
    onError: (error) => addToast('error', extractErrorMessage(error)),
  });

  if (isLoading) return <><PageHeader /><main className="page-content"><SkeletonGrid /></main></>;
  if (!isAdmin) return <Navigate to="/" replace />;

  return (
    <div className="page-wrapper">
      <PageHeader />
      <main className="page-content">
        <h1 style={{ marginBottom: '1.5rem' }}>Administración</h1>

        <section aria-labelledby="admin-users-title" className="admin-section">
          <h2 id="admin-users-title" className="section-label">Usuarios</h2>
          <label htmlFor="admin-user-search" className="sr-only">Buscar usuarios</label>
          <input
            id="admin-user-search"
            type="search"
            className="search-input"
            placeholder="Buscar usuario…"
            value={userQuery}
            onChange={(e) => setUserQuery(e.target.value)}
          />
          <SearchStatus query={userQuery} result={usersResult} />
          <ul className="admin-list">
            {(usersResult.data ?? []).map((user) => (
              <li key={user.username} className="admin-row">
                <UserAvatar username={user.username} avatarVersion={user.avatarVersion ?? null} size={32} />
                <span className="admin-row-name">{user.username}</span>
                {user.admin && <span className="admin-row-meta">admin</span>}
                {!user.admin && (
                  <div className="admin-row-actions">
                    {user.avatarVersion != null && (
                      <button type="button" className="btn-ghost" aria-label={`Quitar foto de ${user.username}`}
                        onClick={() => setPending({ kind: 'photo', user })}>
                        Quitar foto
                      </button>
                    )}
                    <button type="button" className="btn-danger" aria-label={`Borrar cuenta de ${user.username}`}
                      onClick={() => setPending({ kind: 'delete', user })}>
                      Borrar cuenta
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="admin-leagues-title" className="admin-section">
          <h2 id="admin-leagues-title" className="section-label">Ligas</h2>
          <label htmlFor="admin-league-search" className="sr-only">Buscar ligas</label>
          <input
            id="admin-league-search"
            type="search"
            className="search-input"
            placeholder="Buscar liga…"
            value={leagueQuery}
            onChange={(e) => setLeagueQuery(e.target.value)}
          />
          <SearchStatus query={leagueQuery} result={leaguesResult} />
          <ul className="admin-list">
            {(leaguesResult.data ?? []).map((league) => (
              <li key={league.id} className="admin-row">
                <span className="admin-row-name">{league.name}</span>
                <span className="admin-row-meta">{league.members} miembros</span>
                <div className="admin-row-actions">
                  <button type="button" className="btn-ghost" aria-label={`Renombrar ${league.name}`}
                    onClick={() => setRenaming(league)}>Renombrar</button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </main>

      {pending && (
        <ConfirmDialog
          title={pending.kind === 'photo' ? 'Quitar foto' : 'Borrar cuenta'}
          message={pending.kind === 'photo'
            ? `Se quitará la foto de perfil de ${pending.user.username}.`
            : `Se borrará la cuenta de ${pending.user.username}: sale de sus ligas y su nombre pasa a «Usuario eliminado». No se puede deshacer.`}
          confirmLabel={pending.kind === 'photo' ? 'Quitar foto' : 'Borrar cuenta'}
          pendingLabel={pending.kind === 'photo' ? 'Quitando…' : 'Borrando…'}
          pending={userAction.isPending}
          danger
          onConfirm={() => userAction.mutate(pending)}
          onClose={() => setPending(null)}
        />
      )}
      {renaming && <RenameLeagueDialog league={renaming} onClose={() => setRenaming(null)} />}
    </div>
  );
}

function RenameLeagueDialog({ league, onClose }: { league: AdminLeague; onClose: () => void }) {
  const titleId = useId();
  const inputId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(league.name);
  const error = leagueNameError(name);
  const queryClient = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);

  const mutation = useMutation({
    mutationFn: () => renameLeague(league.id, name.trim()),
    onSuccess: () => {
      addToast('success', 'Liga renombrada');
      queryClient.invalidateQueries({ queryKey: ['admin-leagues'] });
      onClose();
    },
    onError: (e) => addToast('error', extractErrorMessage(e)),
  });

  useFocusTrap(dialogRef, { initialFocusRef: inputRef });

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !mutation.isPending) onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [mutation.isPending, onClose]);

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget && !mutation.isPending) onClose(); }}>
      <div ref={dialogRef} className="modal animate-in-fast confirm-dialog" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <h2 id={titleId}>Renombrar liga</h2>
        <form onSubmit={(e) => { e.preventDefault(); if (!error) mutation.mutate(); }}>
          <label htmlFor={inputId}>Nuevo nombre</label>
          <input
            ref={inputRef}
            id={inputId}
            className="search-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            aria-invalid={!!error}
            aria-describedby={`${inputId}-hint`}
            disabled={mutation.isPending}
          />
          <p id={`${inputId}-hint`} className={error ? 'field-hint field-hint-error' : 'field-hint'}>
            {error ?? 'Entre 1 y 40 caracteres.'}
          </p>
          <div className="modal-actions">
            <button type="button" className="btn-ghost" onClick={onClose} disabled={mutation.isPending}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={!!error || mutation.isPending}>
              {mutation.isPending ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/** Estado de una búsqueda, anunciado a lectores de pantalla: mínimo de letras, cargando, error o sin resultados. */
function SearchStatus({ query, result }: { query: string; result: UseQueryResult<unknown[]> }) {
  const q = query.trim();
  let content: ReactNode = null;
  if (q.length > 0 && q.length < MIN_QUERY) {
    content = <p className="field-hint">Escribe al menos {MIN_QUERY} letras.</p>;
  } else if (result.isError) {
    content = <p className="field-hint field-hint-error">No se ha podido buscar: {extractErrorMessage(result.error)}</p>;
  } else if (result.isFetching && !result.data) {
    content = <SkeletonGrid count={2} cardHeight="48px" />;
  } else if (q.length >= MIN_QUERY && result.data?.length === 0) {
    content = <p className="field-hint">Sin resultados</p>;
  }
  return <div aria-live="polite">{content}</div>;
}
