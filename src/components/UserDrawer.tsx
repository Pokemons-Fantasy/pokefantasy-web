import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import type { League } from '../api/leagues';
import UserAvatar from './avatar/UserAvatar';

interface UserDrawerProps {
  username: string;
  avatarVersion: number | null | undefined;
  leagues: League[];
  /** Intercambios pendientes por liga (id → número). */
  pendingByLeague: Map<string, number>;
  /** Liga abierta ahora, para marcarla. */
  currentLeagueId: string | null;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  onLogout: () => void;
  onClose: () => void;
}

const FOCUSABLE = 'a[href], button:not([disabled])';

/**
 * Panel lateral de la cuenta (móvil): perfil, ligas, intercambios pendientes, tema y cerrar sesión.
 * Va en un portal porque la cabecera usa backdrop-filter y fijaría el panel dentro de ella.
 */
export default function UserDrawer({
  username, avatarVersion, leagues, pendingByLeague, currentLeagueId, theme, onToggleTheme, onLogout, onClose,
}: UserDrawerProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  // Foco dentro al abrir y de vuelta al botón que lo abrió al cerrar; la página no hace scroll detrás.
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    return () => {
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key !== 'Tab' || !panelRef.current) return;
      const focusable = [...panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)];
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const leagueName = (id: string) => leagues.find((l) => l.id === id)?.name ?? 'Liga';
  const totalPending = [...pendingByLeague.values()].reduce((a, b) => a + b, 0);

  return createPortal(
    <div className="user-drawer-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div ref={panelRef} className="user-drawer" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div className="user-drawer-head">
          <UserAvatar username={username} avatarVersion={avatarVersion} size={48} />
          <h2 id={titleId} className="user-drawer-name">{username}</h2>
          <button ref={closeRef} type="button" className="btn-ghost user-drawer-close" aria-label="Cerrar" onClick={onClose}>
            ✕
          </button>
        </div>

        <nav className="user-drawer-section" aria-label="Tu cuenta">
          <Link className="user-drawer-item" to="/profile" onClick={onClose}>Mi perfil</Link>
          <Link className="user-drawer-item" to="/leagues" onClick={onClose}>Mis ligas</Link>
        </nav>

        {totalPending > 0 && (
          <section className="user-drawer-section">
            <h3 className="user-drawer-label">
              {totalPending === 1 ? '1 intercambio pendiente' : `${totalPending} intercambios pendientes`}
            </h3>
            {[...pendingByLeague.entries()].map(([leagueId, count]) => (
              <Link
                key={leagueId}
                className="user-drawer-item"
                to={`/leagues/${leagueId}/teams`}
                state={{ openTrades: true }}
                onClick={onClose}
              >
                <span className="user-drawer-item-text">{leagueName(leagueId)}</span>
                <span className="badge badge-yellow">{count}</span>
              </Link>
            ))}
          </section>
        )}

        {leagues.length > 0 && (
          <section className="user-drawer-section">
            <h3 className="user-drawer-label">Tus ligas</h3>
            {leagues.map((league) => (
              <Link
                key={league.id}
                className="user-drawer-item"
                to={`/leagues/${league.id}`}
                aria-current={league.id === currentLeagueId ? 'page' : undefined}
                onClick={onClose}
              >
                <span className="user-drawer-item-text">{league.name}</span>
              </Link>
            ))}
          </section>
        )}

        <div className="user-drawer-footer">
          <button type="button" className="btn-ghost" onClick={onToggleTheme}>
            {theme === 'dark' ? '☀️ Modo claro' : '🌙 Modo oscuro'}
          </button>
          <button type="button" className="btn-danger" onClick={onLogout}>
            Cerrar sesión
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
