import { useSyncExternalStore } from 'react';
import { Capacitor } from '@capacitor/core';

/**
 * Modo de layout: diseño de app en móvil (y siempre en la APK), el de siempre en escritorio.
 * El ancho debe coincidir con los `@media (max-width: 767px)` de `src/styles`.
 */
export type LayoutMode = 'mobile' | 'desktop';

export const MOBILE_MAX_WIDTH = 767;
export const MOBILE_QUERY = `(max-width: ${MOBILE_MAX_WIDTH}px)`;

function mediaQuery(): MediaQueryList | null {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia(MOBILE_QUERY)
    : null;
}

function subscribe(onChange: () => void): () => void {
  const mql = mediaQuery();
  if (!mql) return () => {};
  mql.addEventListener('change', onChange);
  return () => mql.removeEventListener('change', onChange);
}

const isNarrow = () => mediaQuery()?.matches ?? false;

export function useLayoutMode(): LayoutMode {
  const narrow = useSyncExternalStore(subscribe, isNarrow, () => false);
  return Capacitor.isNativePlatform() || narrow ? 'mobile' : 'desktop';
}
