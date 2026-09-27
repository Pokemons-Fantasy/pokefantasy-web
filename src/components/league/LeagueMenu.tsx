import { useEffect, useId, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type { LeagueNavItem } from '../../utils/leagueNav';

interface LeagueMenuProps {
  items: LeagueNavItem[];
  active: string;
}

/** Menú de engranaje (patrón disclosure): acciones de la liga que no son pestañas. */
export default function LeagueMenu({ items, active }: LeagueMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listId = useId();
  const isActive = items.some((item) => item.path === active);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    const onPointerDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('mousedown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('mousedown', onPointerDown);
    };
  }, [open]);

  return (
    <div className="league-menu" ref={rootRef}>
      <button
        ref={buttonRef}
        type="button"
        className={`btn-ghost league-menu-button${isActive ? ' active' : ''}`}
        aria-label="Más opciones de la liga"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((o) => !o)}
      >
        ⚙
      </button>
      {open && (
        <div id={listId} className="league-menu-list">
          {items.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className="league-menu-item"
              aria-current={item.path === active ? 'page' : undefined}
              onClick={() => setOpen(false)}
            >
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
