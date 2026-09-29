import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import { useTheme } from '../hooks/useTheme';
import { getMe } from '../api/auth';
import { getMyLeagues } from '../api/leagues';
import { getMyPendingTrades } from '../api/trades';
import UserAvatar from './avatar/UserAvatar';
import UserDrawer from './UserDrawer';

interface PageHeaderProps {
  /** Custom left side. Defaults to plain logo linking to '/'. */
  left?: ReactNode;
  /** Extra buttons inserted before the theme toggle in header-right. */
  rightExtra?: ReactNode;
}

export default function PageHeader({ left, rightExtra }: PageHeaderProps) {
  const username = useAuthStore((s) => s.username);
  const logout   = useAuthStore((s) => s.logout);
  const { theme, toggle } = useTheme();
  const { pathname } = useLocation();
  // El panel se abre para la ruta actual: al navegar (también con "atrás") se cierra solo.
  const [drawerPath, setDrawerPath] = useState<string | null>(null);
  const drawerOpen = drawerPath === pathname;

  const signedIn = !!username;
  const { data: me } = useQuery({ queryKey: ['me'], queryFn: getMe, staleTime: 5 * 60_000, enabled: signedIn });
  const { data: leagues = [] } = useQuery({
    queryKey: ['my-leagues'], queryFn: getMyLeagues, staleTime: 60_000, enabled: signedIn,
  });
  const { data: pending = [] } = useQuery({
    queryKey: ['my-pending-trades'], queryFn: getMyPendingTrades, staleTime: 30_000, enabled: signedIn,
  });

  const pendingByLeague = useMemo(() => {
    const counts = new Map<string, number>();
    for (const t of pending) counts.set(t.leagueId, (counts.get(t.leagueId) ?? 0) + 1);
    return counts;
  }, [pending]);
  const pendingLabel = pending.length === 1 ? '1 intercambio pendiente' : `${pending.length} intercambios pendientes`;
  const currentLeagueId = pathname.match(/^\/leagues\/([^/]+)/)?.[1] ?? null;

  const avatar = (size: number) => (
    <span className="header-avatar">
      <UserAvatar username={username ?? ''} avatarVersion={me?.avatarVersion ?? null} size={size} />
      {pending.length > 0 && <span className="header-avatar-dot" aria-hidden="true" />}
    </span>
  );

  return (
    <header className="page-header">
      <div className="page-header-inner">
        {left ?? <Link className="logo" to="/">PokeFantasy</Link>}
        <div className="header-right">
          {rightExtra}
          <button
            className="btn-ghost header-theme-toggle header-desktop"
            onClick={toggle}
            title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
          <Link className="header-user header-desktop" to="/profile" title="Ver mi perfil">
            {avatar(26)}
            <span>Hola, <strong>{username}</strong></span>
            {pending.length > 0 && <span className="sr-only">{`, ${pendingLabel}`}</span>}
          </Link>
          <button className="btn-ghost header-desktop" onClick={logout}>
            Cerrar sesión
          </button>
          <button
            type="button"
            className="header-avatar-button header-mobile"
            aria-label={pending.length > 0 ? `Tu cuenta, ${pendingLabel}` : 'Tu cuenta'}
            aria-haspopup="dialog"
            aria-expanded={drawerOpen}
            onClick={() => setDrawerPath(pathname)}
          >
            {avatar(36)}
          </button>
        </div>
      </div>

      {drawerOpen && username && (
        <UserDrawer
          username={username}
          avatarVersion={me?.avatarVersion ?? null}
          leagues={leagues}
          pendingByLeague={pendingByLeague}
          currentLeagueId={currentLeagueId}
          theme={theme}
          onToggleTheme={toggle}
          onLogout={logout}
          onClose={() => setDrawerPath(null)}
        />
      )}
    </header>
  );
}
