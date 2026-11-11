import { useId } from 'react';
import { Link } from 'react-router-dom';
import type { LeagueNavItem } from '../../utils/leagueNav';
import Sheet from './Sheet';
import menu from './SheetMenu.module.css';

interface MoreSheetProps {
  items: LeagueNavItem[];
  /** Sección actual, para marcarla. */
  active: string;
  onClose: () => void;
}

/** "Más" de la barra inferior: secciones de la liga que no caben en ella (draft, configuración, miembros...). */
export default function MoreSheet({ items, active, onClose }: MoreSheetProps) {
  const titleId = useId();
  return (
    <Sheet labelledBy={titleId} onClose={onClose}>
      <h2 id={titleId} className={menu.label}>Más</h2>
      <nav className={menu.section} aria-labelledby={titleId}>
        {items.map((item) => (
          <Link
            key={item.path}
            className={menu.item}
            to={item.path}
            aria-current={item.path === active ? 'page' : undefined}
            onClick={onClose}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </Sheet>
  );
}
