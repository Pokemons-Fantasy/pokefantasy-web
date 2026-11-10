import { useRef } from 'react';
import type { KeyboardEvent } from 'react';
import styles from './SegmentedTabs.module.css';

interface SegmentedTabsProps<T extends string> {
  /** Nombre de la lista para lectores de pantalla. */
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  /** Prefijo de ids: pestañas `${idPrefix}-tab-${value}` y panel `${idPrefix}-panel` (lo pinta quien lo usa). */
  idPrefix: string;
}

/** Sub-pestañas de una pantalla (móvil). Patrón de pestañas de ARIA: flechas, Inicio y Fin cambian de pestaña. */
export default function SegmentedTabs<T extends string>({ label, options, value, onChange, idPrefix }: SegmentedTabsProps<T>) {
  const refs = useRef(new Map<T, HTMLButtonElement>());

  const select = (index: number) => {
    const next = options[(index + options.length) % options.length].value;
    onChange(next);
    refs.current.get(next)?.focus();
  };

  const onKeyDown = (e: KeyboardEvent, index: number) => {
    if (e.key === 'ArrowRight') select(index + 1);
    else if (e.key === 'ArrowLeft') select(index - 1);
    else if (e.key === 'Home') select(0);
    else if (e.key === 'End') select(options.length - 1);
    else return;
    e.preventDefault();
  };

  return (
    <div className={styles.list} role="tablist" aria-label={label}>
      {options.map((option, index) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            ref={(el) => { if (el) refs.current.set(option.value, el); else refs.current.delete(option.value); }}
            type="button"
            role="tab"
            id={`${idPrefix}-tab-${option.value}`}
            aria-controls={`${idPrefix}-panel`}
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            className={selected ? `${styles.tab} ${styles.selected}` : styles.tab}
            onClick={() => onChange(option.value)}
            onKeyDown={(e) => onKeyDown(e, index)}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
