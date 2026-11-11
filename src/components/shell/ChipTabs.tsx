import { useEffect } from 'react';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { useRovingTabs } from './useRovingTabs';
import styles from './ChipTabs.module.css';

interface ChipTabsProps<T extends string | number> {
  /** Nombre de la lista para lectores de pantalla. */
  label: string;
  /** `label` se ve en la chip ("J3"); `ariaLabel` es lo que se anuncia ("Jornada 3, actual"). */
  options: { value: T; label: string; ariaLabel: string }[];
  value: T;
  onChange: (value: T) => void;
  /** Prefijo de ids: pestañas `${idPrefix}-tab-${value}` y panel `${idPrefix}-panel` (lo pinta quien lo usa). */
  idPrefix: string;
}

/** Tira de chips con scroll horizontal (jornadas, rondas). Mismo patrón de pestañas que `SegmentedTabs`. */
export default function ChipTabs<T extends string | number>({ label, options, value, onChange, idPrefix }: ChipTabsProps<T>) {
  const { onKeyDown, refFor, refs } = useRovingTabs(options.map((o) => o.value), onChange);
  const reduceMotion = useReducedMotion();

  // La chip activa se centra en la tira (scrollIntoView es opcional porque jsdom no lo implementa)
  useEffect(() => {
    refs.current.get(value)?.scrollIntoView?.({
      inline: 'center',
      block: 'nearest',
      behavior: reduceMotion ? 'auto' : 'smooth',
    });
  }, [value, reduceMotion, refs]);

  return (
    <div className={styles.list} role="tablist" aria-label={label}>
      {options.map((option, index) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            ref={refFor(option.value)}
            type="button"
            role="tab"
            id={`${idPrefix}-tab-${option.value}`}
            aria-controls={`${idPrefix}-panel`}
            aria-selected={selected}
            aria-label={option.ariaLabel}
            tabIndex={selected ? 0 : -1}
            className={selected ? `${styles.chip} ${styles.selected}` : styles.chip}
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
