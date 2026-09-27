import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import type { LeagueNavItem } from '../../utils/leagueNav';
import { useReducedMotion } from '../../hooks/useReducedMotion';

interface LeagueTabsProps {
  tabs: LeagueNavItem[];
  /** Sección activa (ver activeSection); '' si ninguna pestaña lo está. */
  active: string;
}

export default function LeagueTabs({ tabs, active }: LeagueTabsProps) {
  const activeRef = useRef<HTMLAnchorElement>(null);
  const reduceMotion = useReducedMotion();

  // En móvil la tira hace scroll: la pestaña activa se centra al cambiar de sección.
  // scrollIntoView es opcional porque jsdom no lo implementa.
  useEffect(() => {
    activeRef.current?.scrollIntoView?.({
      inline: 'center',
      block: 'nearest',
      behavior: reduceMotion ? 'auto' : 'smooth',
    });
  }, [active, reduceMotion]);

  return (
    <nav className="league-tabs" aria-label="Secciones de la liga">
      {tabs.map((tab) => {
        const isActive = tab.path === active;
        return (
          <Link
            key={tab.path}
            to={tab.path}
            ref={isActive ? activeRef : undefined}
            className={`league-tab${isActive ? ' active' : ''}`}
            aria-current={isActive ? 'page' : undefined}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
