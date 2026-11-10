import { Link } from 'react-router-dom';
import { Ellipsis } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import styles from './BottomNav.module.css';

export interface BottomNavItem {
  /** Destino relativo a la liga (`teams`, `schedule`...). */
  path: string;
  label: string;
  icon: LucideIcon;
  badge?: number;
  /** Texto del badge para lectores de pantalla ("3 intercambios pendientes"). */
  badgeLabel?: string;
}

interface BottomNavProps {
  items: BottomNavItem[];
  /** Sección actual (ver activeSection). */
  active: string;
  onMore: () => void;
  /** La sección actual está dentro de "Más". */
  moreActive: boolean;
}

/** Barra inferior de la liga en móvil. `data-bottom-nav` activa `--bottom-nav-h` en todo el documento. */
export default function BottomNav({ items, active, onMore, moreActive }: BottomNavProps) {
  return (
    <nav className={styles.nav} aria-label="Secciones de la liga" data-bottom-nav>
      {items.map(({ path, label, icon: Icon, badge, badgeLabel }) => {
        const isActive = path === active;
        return (
          <Link
            key={path}
            to={path}
            className={isActive ? `${styles.item} ${styles.active}` : styles.item}
            aria-current={isActive ? 'page' : undefined}
          >
            <span className={styles.iconWrap}>
              <Icon size={22} aria-hidden="true" />
              {!!badge && (
                <span className={styles.badge} aria-hidden="true">{badge > 9 ? '9+' : badge}</span>
              )}
            </span>
            <span className={styles.label}>{label}</span>
            {!!badge && badgeLabel && <span className="sr-only">{`, ${badgeLabel}`}</span>}
          </Link>
        );
      })}
      <button
        type="button"
        className={moreActive ? `${styles.item} ${styles.active}` : styles.item}
        aria-haspopup="dialog"
        aria-current={moreActive ? 'page' : undefined}
        onClick={onMore}
      >
        <span className={styles.iconWrap}><Ellipsis size={22} aria-hidden="true" /></span>
        <span className={styles.label}>Más</span>
      </button>
    </nav>
  );
}
