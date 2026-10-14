import { useEffect, useState } from 'react';

/** Hora actual, refrescada cada `intervalMs`: para cuentas atrás que deben avanzar sin recargar. */
export function useNow(intervalMs = 60_000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}
