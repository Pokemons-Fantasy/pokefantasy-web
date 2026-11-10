import { useId, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getMe } from '../../api/auth';
import { getMyLeagues } from '../../api/leagues';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../hooks/useTheme';
import UserAvatar from '../avatar/UserAvatar';
import PushToggle from '../push/PushToggle';
import AppVersion from '../AppVersion';
import Sheet from './Sheet';
import { pendingLabel, usePendingTrades } from './usePendingTrades';
import menu from './SheetMenu.module.css';

/** "Tu cuenta" en móvil: perfil, ligas, intercambios pendientes, avisos, tema y cerrar sesión. */
export default function AccountSheet({ onClose }: { onClose: () => void }) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const { pathname } = useLocation();
  const username = useAuthStore((s) => s.username) ?? '';
  const logout = useAuthStore((s) => s.logout);
  const { theme, toggle } = useTheme();
  const { data: me } = useQuery({ queryKey: ['me'], queryFn: getMe, staleTime: 5 * 60_000, enabled: !!username });
  const { data: leagues = [] } = useQuery({
    queryKey: ['my-leagues'], queryFn: getMyLeagues, staleTime: 60_000, enabled: !!username,
  });
  const { byLeague, total } = usePendingTrades();
  const currentLeagueId = pathname.match(/^\/leagues\/([^/]+)/)?.[1] ?? null;
  const leagueName = (id: string) => leagues.find((l) => l.id === id)?.name ?? 'Liga';

  return (
    <Sheet labelledBy={titleId} onClose={onClose} initialFocusRef={closeRef}>
      <div className={menu.head}>
        <UserAvatar username={username} avatarVersion={me?.avatarVersion ?? null} size={48} />
        <h2 id={titleId} className={menu.title}>{username}</h2>
        <button ref={closeRef} type="button" className={`btn-ghost ${menu.close}`} aria-label="Cerrar" onClick={onClose}>
          ✕
        </button>
      </div>

      <nav className={menu.section} aria-label="Tu cuenta">
        <Link className={menu.item} to="/profile" onClick={onClose}>Mi perfil</Link>
        <Link className={menu.item} to="/leagues" onClick={onClose}>Mis ligas</Link>
      </nav>

      {total > 0 && (
        <section className={menu.section}>
          <h3 className={menu.label}>{pendingLabel(total)}</h3>
          {[...byLeague.entries()].map(([leagueId, count]) => (
            <Link
              key={leagueId}
              className={menu.item}
              to={`/leagues/${leagueId}/teams`}
              state={{ openTrades: true }}
              onClick={onClose}
            >
              <span className={menu.itemText}>{leagueName(leagueId)}</span>
              <span className="badge badge-yellow">{count}</span>
            </Link>
          ))}
        </section>
      )}

      {leagues.length > 0 && (
        <section className={menu.section}>
          <h3 className={menu.label}>Tus ligas</h3>
          {leagues.map((league) => (
            <Link
              key={league.id}
              className={menu.item}
              to={`/leagues/${league.id}`}
              aria-current={league.id === currentLeagueId ? 'page' : undefined}
              onClick={onClose}
            >
              <span className={menu.itemText}>{league.name}</span>
            </Link>
          ))}
        </section>
      )}

      <div className={menu.footer}>
        <PushToggle />
        <button type="button" className="btn-ghost" onClick={toggle}>
          {theme === 'dark' ? '☀️ Modo claro' : '🌙 Modo oscuro'}
        </button>
        <button type="button" className="btn-danger" onClick={logout}>
          Cerrar sesión
        </button>
        <AppVersion />
      </div>
    </Sheet>
  );
}
