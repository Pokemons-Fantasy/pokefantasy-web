import { API_BASE_URL } from './client';

export interface EventStreamHandlers {
  listeners: Record<string, (event: MessageEvent) => void>;
  /** Conexión abierta; `reconnected` es false la primera vez. */
  onOpen?: (reconnected: boolean) => void;
  /** Conexión caída; se reintentará sola. */
  onDown?: () => void;
}

export const SSE_RETRY_MIN_MS = 2_000;
export const SSE_RETRY_MAX_MS = 60_000;

/**
 * SSE autenticado (cookie de sesión) que se reconecta solo: el proxy de Netlify corta las conexiones en
 * menos de 26 s. La espera entre reintentos crece hasta 1 min mientras el backend no responda y vuelve al
 * mínimo al conectar. Devuelve la función que la cierra para siempre.
 */
export function openEventStream(path: string, handlers: EventStreamHandlers): () => void {
  let source: EventSource | null = null;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;
  let retryMs = SSE_RETRY_MIN_MS;
  let openedBefore = false;
  let stopped = false;

  const connect = () => {
    source = new EventSource(`${API_BASE_URL}${path}`, { withCredentials: true });
    for (const [type, listener] of Object.entries(handlers.listeners)) {
      source.addEventListener(type, listener as EventListener);
    }
    source.onopen = () => {
      retryMs = SSE_RETRY_MIN_MS;
      handlers.onOpen?.(openedBefore);
      openedBefore = true;
    };
    source.onerror = () => {
      source?.close(); // el reintento lo lleva este módulo (con espera creciente), no el navegador
      if (stopped) return;
      handlers.onDown?.();
      retryTimer = setTimeout(connect, retryMs);
      retryMs = Math.min(retryMs * 2, SSE_RETRY_MAX_MS);
    };
  };

  connect();
  return () => {
    stopped = true;
    if (retryTimer) clearTimeout(retryTimer);
    source?.close();
  };
}
