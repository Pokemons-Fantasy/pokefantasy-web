import type { ReactNode } from 'react';
import styles from './AppBar.module.css';

interface AppBarProps {
  left?: ReactNode;
  title?: ReactNode;
  right?: ReactNode;
}

/**
 * Barra superior en móvil. Mide lo mismo que `.page-header` (60px + safe area) para que los elementos
 * `sticky` de las páginas sigan colocándose debajo.
 */
export default function AppBar({ left, title, right }: AppBarProps) {
  return (
    <header className={styles.bar}>
      <div className={styles.inner}>
        {left && <div className={styles.side}>{left}</div>}
        <div className={styles.title}>{title}</div>
        {right && <div className={styles.side}>{right}</div>}
      </div>
    </header>
  );
}
