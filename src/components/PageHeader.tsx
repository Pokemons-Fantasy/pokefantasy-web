import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useTheme } from '../hooks/useTheme';

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

  return (
    <header className="page-header">
      <div className="page-header-inner">
        {left ?? <Link className="logo" to="/">PokeFantasy</Link>}
        <div className="header-right">
          {rightExtra}
          <button
            className="btn-ghost"
            style={{ padding: '0.3rem 0.55rem', fontSize: '1rem', lineHeight: 1 }}
            onClick={toggle}
            title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
          <Link className="header-user" to="/profile" title="Ver mi perfil">
            Hola, <strong>{username}</strong>
          </Link>
          <button className="btn-ghost" onClick={logout}>
            Cerrar sesión
          </button>
        </div>
      </div>
    </header>
  );
}
