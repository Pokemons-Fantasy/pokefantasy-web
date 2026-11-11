import { useRef } from 'react';
import type { KeyboardEvent } from 'react';

/**
 * Teclado del patrón de pestañas de ARIA (foco itinerante): flechas con vuelta, Inicio y Fin
 * seleccionan y llevan el foco a la pestaña. Lo comparten `SegmentedTabs` y `ChipTabs`.
 */
export function useRovingTabs<T>(values: T[], onChange: (value: T) => void) {
  const refs = useRef(new Map<T, HTMLButtonElement>());

  const select = (index: number) => {
    const next = values[(index + values.length) % values.length];
    onChange(next);
    refs.current.get(next)?.focus();
  };

  const onKeyDown = (e: KeyboardEvent, index: number) => {
    if (e.key === 'ArrowRight') select(index + 1);
    else if (e.key === 'ArrowLeft') select(index - 1);
    else if (e.key === 'Home') select(0);
    else if (e.key === 'End') select(values.length - 1);
    else return;
    e.preventDefault();
  };

  const refFor = (value: T) => (el: HTMLButtonElement | null) => {
    if (el) refs.current.set(value, el);
    else refs.current.delete(value);
  };

  return { onKeyDown, refFor, refs };
}
