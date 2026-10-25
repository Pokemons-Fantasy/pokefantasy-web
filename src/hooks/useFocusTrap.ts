import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

/** Trampas montadas, la última arriba: con un modal sobre otro solo manda el de encima. */
const stack: object[] = [];

interface FocusTrapOptions {
  /** Dónde empieza el foco al abrir; sin él, el propio contenedor (necesita `tabIndex={-1}`). */
  initialFocusRef?: RefObject<HTMLElement | null>;
  /** Escape; sin él no hace nada (p. ej. mientras hay una acción en curso). */
  onEscape?: () => void;
}

/**
 * Foco de un modal: entra al abrir, Tab y Shift+Tab ciclan dentro del contenedor, Escape llama a `onEscape` y
 * al cerrar el foco vuelve a donde estaba. Con un modal encima de otro solo responde el de arriba.
 */
export function useFocusTrap(
  containerRef: RefObject<HTMLElement | null>,
  { initialFocusRef, onEscape }: FocusTrapOptions = {},
) {
  const onEscapeRef = useRef(onEscape);
  useEffect(() => { onEscapeRef.current = onEscape; });

  useEffect(() => {
    const id = {};
    stack.push(id);
    const previous = document.activeElement as HTMLElement | null;
    (initialFocusRef?.current ?? containerRef.current)?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      const container = containerRef.current;
      if (!container || stack[stack.length - 1] !== id) return;
      if (e.key === 'Escape') {
        onEscapeRef.current?.();
        return;
      }
      if (e.key !== 'Tab') return;
      const focusable = [...container.querySelectorAll<HTMLElement>(FOCUSABLE)];
      if (focusable.length === 0) {
        e.preventDefault();
        container.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      // Desde el contenedor (o desde fuera) también se entra por el extremo que toca.
      const outside = !active || active === container || !container.contains(active);
      if (e.shiftKey && (outside || active === first)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (outside || active === last)) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      stack.splice(stack.indexOf(id), 1);
      previous?.focus();
    };
    // Solo al montar: el foco inicial no se repite si cambian las refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
