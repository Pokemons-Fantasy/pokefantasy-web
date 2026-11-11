import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';

/**
 * Botón atrás de Android. Los paneles abiertos (sheets y modales) se apuntan a una pila mientras están montados:
 * atrás cierra el de arriba; sin paneles, vuelve atrás en el historial y, sin historial, minimiza la app.
 */
type Entry = { current: (() => void) | undefined };

const stack: Entry[] = [];

/** Apunta `onBack` a la pila mientras el componente está montado. `undefined` (no se puede cerrar) ocupa su sitio. */
export function useBackHandler(onBack: (() => void) | undefined): void {
  const entry = useRef<Entry>({ current: onBack });
  useEffect(() => { entry.current.current = onBack; });

  useEffect(() => {
    const own = entry.current;
    stack.push(own);
    return () => {
      const i = stack.lastIndexOf(own);
      if (i !== -1) stack.splice(i, 1);
    };
  }, []);
}

export function handleBack(canGoBack: boolean, goBack: () => void, minimize: () => void): void {
  const top = stack.at(-1);
  if (top) {
    top.current?.();
    return;
  }
  if (canGoBack) goBack();
  else minimize();
}

/** Escucha el botón atrás en la app nativa (en la web ya lo gestiona el navegador). Va dentro del router. */
export function AndroidBackButton(): null {
  const navigate = useNavigate();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const sub = CapApp.addListener('backButton', ({ canGoBack }) => {
      handleBack(canGoBack, () => navigate(-1), () => { void CapApp.minimizeApp(); });
    });
    return () => { void sub.then((h) => h.remove()); };
  }, [navigate]);

  return null;
}
