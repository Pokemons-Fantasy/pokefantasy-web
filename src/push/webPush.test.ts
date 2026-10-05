import { describe, it, expect, vi, beforeEach } from 'vitest';

const order: string[] = [];
vi.mock('firebase/app', () => ({
  getApps: vi.fn(() => []),
  initializeApp: vi.fn(() => { order.push('firebase'); return {}; }),
}));
vi.mock('firebase/messaging', () => ({
  getMessaging: vi.fn(() => ({})),
  getToken: vi.fn(async () => 'browser-token'),
  deleteToken: vi.fn(async () => true),
}));
vi.mock('../api/push', () => ({
  registerPushToken: vi.fn(async () => {}),
  unregisterPushToken: vi.fn(async () => {}),
}));

import * as messaging from 'firebase/messaging';
import * as api from '../api/push';
import { disableWebPush, enableWebPush, forgetWebPushOnLogout, resumeWebPush } from './webPush';

const registration = { scope: '/' } as ServiceWorkerRegistration;
const subscription = { unsubscribe: vi.fn(async () => true) };

function stubBrowser(permission: NotificationPermission, answer: NotificationPermission = permission) {
  vi.stubGlobal('Notification', {
    permission,
    requestPermission: vi.fn(async () => { order.push('permission'); return answer; }),
  });
  Object.defineProperty(navigator, 'serviceWorker', {
    configurable: true,
    value: {
      register: vi.fn(async () => registration),
      getRegistration: vi.fn(async () => ({ pushManager: { getSubscription: async () => subscription } })),
    },
  });
}

describe('push/webPush', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    order.length = 0;
    localStorage.clear();
    vi.stubEnv('VITE_FIREBASE_API_KEY', 'k');
    vi.stubEnv('VITE_FIREBASE_PROJECT_ID', 'p');
    vi.stubEnv('VITE_FIREBASE_MESSAGING_SENDER_ID', 's');
    vi.stubEnv('VITE_FIREBASE_APP_ID', 'a');
    vi.stubEnv('VITE_FIREBASE_VAPID_KEY', 'vapid');
  });

  it('activar pide el permiso antes que nada, registra el token y lo guarda para ese usuario', async () => {
    stubBrowser('default', 'granted');

    await expect(enableWebPush('ash')).resolves.toBe('enabled');

    expect(order[0]).toBe('permission');
    expect(navigator.serviceWorker.register).toHaveBeenCalledWith('/firebase-messaging-sw.js');
    expect(messaging.getToken).toHaveBeenCalledWith(expect.anything(), { vapidKey: 'vapid', serviceWorkerRegistration: registration });
    expect(api.registerPushToken).toHaveBeenCalledWith('browser-token');
    expect(localStorage.getItem('pf:web-push:ash')).toBe('browser-token');
    expect(localStorage.getItem('pf:web-push:brock')).toBeNull();
  });

  it('si deniega o cierra el diálogo no se registra nada', async () => {
    stubBrowser('default', 'denied');
    await expect(enableWebPush('ash')).resolves.toBe('blocked');
    stubBrowser('default', 'default');
    await expect(enableWebPush('ash')).resolves.toBe('off');
    expect(api.registerPushToken).not.toHaveBeenCalled();
    expect(localStorage.getItem('pf:web-push:ash')).toBeNull();
  });

  it('desactivar da de baja el token en el back, anula la suscripción del navegador y olvida la preferencia', async () => {
    stubBrowser('granted');
    localStorage.setItem('pf:web-push:ash', 'browser-token');

    await disableWebPush('ash');

    expect(api.unregisterPushToken).toHaveBeenCalledWith('browser-token');
    expect(subscription.unsubscribe).toHaveBeenCalled();
    // Sin cargar Firebase: su deleteToken registraría otro service worker en su scope por defecto
    expect(messaging.deleteToken).not.toHaveBeenCalled();
    expect(localStorage.getItem('pf:web-push:ash')).toBeNull();
  });

  it('si entra otra cuenta sin avisos y la anterior los tenía, anula la suscripción de este navegador', async () => {
    // ash no cerró sesión (caducó): su token sigue a su nombre en el back
    stubBrowser('granted');
    localStorage.setItem('pf:web-push:ash', 'browser-token');
    localStorage.setItem('pf:web-push-dismissed:brock', '1');

    await resumeWebPush('brock');

    expect(subscription.unsubscribe).toHaveBeenCalled();
    expect(api.registerPushToken).not.toHaveBeenCalled();
    expect(localStorage.getItem('pf:web-push:ash')).toBe('browser-token');
  });

  it('sin avisos de nadie en este navegador, entrar no toca la suscripción', async () => {
    stubBrowser('granted');
    localStorage.setItem('pf:web-push-dismissed:ash', '1');

    await resumeWebPush('brock');

    expect(subscription.unsubscribe).not.toHaveBeenCalled();
  });

  it('al cerrar sesión da de baja el token y anula la suscripción, pero recuerda que las quería', async () => {
    stubBrowser('granted');
    localStorage.setItem('pf:web-push:ash', 'browser-token');

    await forgetWebPushOnLogout('ash');

    expect(api.unregisterPushToken).toHaveBeenCalledWith('browser-token');
    expect(subscription.unsubscribe).toHaveBeenCalled();
    expect(messaging.deleteToken).not.toHaveBeenCalled();
    expect(localStorage.getItem('pf:web-push:ash')).toBe('browser-token');
  });

  it('al cerrar sesión, aunque la baja en el back falle, la suscripción queda anulada', async () => {
    stubBrowser('granted');
    localStorage.setItem('pf:web-push:ash', 'browser-token');
    vi.mocked(api.unregisterPushToken).mockRejectedValueOnce(new Error('timeout of 5000ms exceeded'));

    await expect(forgetWebPushOnLogout('ash')).resolves.toBeUndefined();

    expect(subscription.unsubscribe).toHaveBeenCalled();
  });

  it('al cerrar sesión sin avisos activados no toca nada', async () => {
    stubBrowser('granted');

    await forgetWebPushOnLogout('ash');

    expect(api.unregisterPushToken).not.toHaveBeenCalled();
    expect(subscription.unsubscribe).not.toHaveBeenCalled();
  });

  it('al entrar las reanuda solo si ese usuario las tenía y el permiso sigue concedido', async () => {
    stubBrowser('granted');
    await resumeWebPush('brock');
    expect(api.registerPushToken).not.toHaveBeenCalled();

    localStorage.setItem('pf:web-push:ash', 'old-token');
    await resumeWebPush('ash');
    expect(api.registerPushToken).toHaveBeenCalledWith('browser-token');
    expect(localStorage.getItem('pf:web-push:ash')).toBe('browser-token');

    vi.clearAllMocks();
    stubBrowser('denied');
    await resumeWebPush('ash');
    expect(api.registerPushToken).not.toHaveBeenCalled();
  });
});
