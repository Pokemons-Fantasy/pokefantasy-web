import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useTheme } from '../hooks/useTheme';
import { useLayoutMode } from '../hooks/useLayoutMode';
import { useSectionTitle } from '../hooks/useSectionTitle';
import { getMe } from '../api/auth';
import { getLastLeague } from '../utils/lastLeague';
import UserAvatar from './avatar/UserAvatar';
import AppBar from './shell/AppBar';
import AccountButton from './shell/AccountButton';
import { pendingLabel, usePendingTrades } from './shell/usePendingTrades';

interface PageHeaderProps {
  /** Custom left side (solo escritorio). Defaults to plain logo linking to '/'. */
  left?: ReactNode;
  /** Extra buttons inserted before the theme toggle in header-right (solo escritorio). */
  rightExtra?: ReactNode;
}

/** Cabecera de las páginas: la de siempre en escritorio; en móvil, app bar con "volver" a la liga y "Tu cuenta". */
export default function PageHeader(props: PageHeaderProps) {
  return useLayoutMode() === 'mobile' ? <MobileHeader /> : <DesktopHeader {...props} />;
}

function MobileHeader() {
  const title = useSectionTitle();
  const lastLeague = getLastLeague();
  return (
    <AppBar
      left={
        <Link className="btn-ghost" to={lastLeague ? `/leagues/${lastLeague}` : '/leagues'} aria-label="Volver">
          <ChevronLeft size={22} aria-hidden="true" />
        </Link>
      }
      title={title}
      right={<AccountButton />}
    />
  );
}

function DesktopHeader({ left, rightExtra }: PageHeaderProps) {
  const username = useAuthStore((s) => s.username);
  const logout   = useAuthStore((s) => s.logout);
  const { theme, toggle } = useTheme();
  const { data: me } = useQuery({ queryKey: ['me'], queryFn: getMe, staleTime: 5 * 60_000, enabled: !!username });
  const { total } = usePendingTrades();

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
            <span className="header-avatar">
              <UserAvatar username={username ?? ''} avatarVersion={me?.avatarVersion ?? null} size={26} />
              {total > 0 && <span className="header-avatar-dot" aria-hidden="true" />}
            </span>
            <span>Hola, <strong>{username}</strong></span>
            {total > 0 && <span className="sr-only">{`, ${pendingLabel(total)}`}</span>}
          </Link>
          <button className="btn-ghost header-desktop" onClick={logout}>
            Cerrar sesión
          </button>
        </div>
      </div>
    </header>
  );
}
