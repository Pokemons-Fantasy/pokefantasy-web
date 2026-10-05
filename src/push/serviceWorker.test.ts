import { describe, it, expect, vi, beforeEach } from 'vitest';
import source from '../../public/firebase-messaging-sw.js?raw';

type Handler = (event: { data?: { json: () => unknown }; notification?: unknown; waitUntil: (p: Promise<unknown>) => void }) => void;

/** Ejecuta el service worker con un `self` falso y devuelve sus manejadores. */
function loadWorker(windows: { visibilityState: string; url: string; focus?: () => Promise<void>; navigate?: (u: string) => Promise<void> }[]) {
  const handlers: Record<string, Handler> = {};
  const self = {
    addEventListener: (type: string, handler: Handler) => { handlers[type] = handler; },
    skipWaiting: vi.fn(),
    location: { origin: 'https://pokefantasy.netlify.app' },
    clients: { matchAll: vi.fn(async () => windows), openWindow: vi.fn(async () => {}), claim: vi.fn() },
    registration: { showNotification: vi.fn(async () => {}) },
  };
  new Function('self', source)(self);
  return { handlers, self };
}

async function dispatch(handler: Handler, event: Omit<Parameters<Handler>[0], 'waitUntil'>) {
  let pending: Promise<unknown> = Promise.resolve();
  handler({ ...event, waitUntil: (p) => { pending = p; } });
  await pending;
}

const push = (payload: unknown) => ({ data: { json: () => payload } });

describe('firebase-messaging-sw', () => {
  beforeEach(() => vi.clearAllMocks());

  it('muestra el aviso aunque la web esté a la vista (el turno y las ventanas no tienen otro aviso, e iOS lo exige)', async () => {
    const { handlers, self } = loadWorker([{ visibilityState: 'visible', url: 'https://pokefantasy.netlify.app/' }]);

    await dispatch(handlers.push, push({
      notification: { title: '¡Te toca en el draft!', body: 'Liga Kanto' },
      data: { link: 'https://pokefantasy.netlify.app/leagues/l1/draft', tag: 'draft-turn-l1' },
    }));

    expect(self.registration.showNotification).toHaveBeenCalledWith('¡Te toca en el draft!', expect.objectContaining({
      body: 'Liga Kanto', tag: 'draft-turn-l1', renotify: true,
      // Android pinta el icono pequeño solo con la transparencia: tiene que ser monocromo
      badge: '/icons/badge-96.png',
      data: { link: 'https://pokefantasy.netlify.app/leagues/l1/draft' },
    }));
  });

  it('sin etiqueta no pide volver a sonar; sin enlace abre la home', async () => {
    const { handlers, self } = loadWorker([]);

    await dispatch(handlers.push, push({ notification: { title: 'Te han robado un Pokémon' } }));

    expect(self.registration.showNotification).toHaveBeenCalledWith('Te han robado un Pokémon', expect.objectContaining({
      tag: undefined, renotify: false, data: { link: '/' },
    }));
  });

  it('al pulsarlo lleva a su pantalla en la pestaña abierta, o abre una', async () => {
    const tab = { visibilityState: 'hidden', url: 'https://pokefantasy.netlify.app/', focus: vi.fn(async () => {}), navigate: vi.fn(async () => {}) };
    const { handlers } = loadWorker([tab]);
    const close = vi.fn();

    await dispatch(handlers.notificationclick, { notification: { close, data: { link: 'https://pokefantasy.netlify.app/leagues/l1/teams' } } });

    expect(close).toHaveBeenCalled();
    expect(tab.focus).toHaveBeenCalled();
    expect(tab.navigate).toHaveBeenCalledWith('https://pokefantasy.netlify.app/leagues/l1/teams');

    const empty = loadWorker([]);
    await dispatch(empty.handlers.notificationclick, { notification: { close, data: { link: '/leagues/l1/draft' } } });
    expect(empty.self.clients.openWindow).toHaveBeenCalledWith('https://pokefantasy.netlify.app/leagues/l1/draft');
  });

  it('con un enlace de otro dominio abre la misma pantalla en este', async () => {
    const { handlers, self } = loadWorker([]);

    await dispatch(handlers.notificationclick, {
      notification: { close: vi.fn(), data: { link: 'http://localhost:5173/leagues/l1/draft?tab=pool#top' } },
    });

    expect(self.clients.openWindow).toHaveBeenCalledWith('https://pokefantasy.netlify.app/leagues/l1/draft?tab=pool#top');
  });
});
