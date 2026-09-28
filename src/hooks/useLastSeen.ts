import { useEffect, useState } from 'react';

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/**
 * Marca de "última visita" guardada en este navegador (preferencia local, no se sincroniza).
 * Devuelve el valor que había al abrir la página y guarda `latest` si es más reciente, para que la
 * próxima visita sepa qué es nuevo. Las fechas se comparan como ISO (mismo formato del backend).
 */
export function useLastSeen(key: string, latest: string | undefined): string | null {
  const [previous] = useState(() => read(key));

  useEffect(() => {
    if (!latest) return;
    const stored = read(key);
    if (stored && new Date(stored).getTime() >= new Date(latest).getTime()) return;
    try {
      localStorage.setItem(key, latest);
    } catch {
      // Sin almacenamiento (modo privado, bloqueado): no hay separador, nada más
    }
  }, [key, latest]);

  return previous;
}
