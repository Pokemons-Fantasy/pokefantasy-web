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

function stubBrowser(permission: NotificationPermission, answer: NotificationPermission = permission) {
  vi.stubGlobal('Notification', {
    permission,
    requestPermission: vi.fn(async () => { order.push('permission'); return answer; }),
  });
  Object.defineProperty(navigator, 'serviceWorker', {
    configurable: true,
    value: { register: vi.fn(async () => registration) },
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

  it('desactivar da de baja el token en el back y en Firebase y olvida la preferencia', async () => {
    stubBrowser('granted');
    localStorage.setItem('pf:web-push:ash', 'browser-token');

    await disableWebPush('ash');

    expect(api.unregisterPushToken).toHaveBeenCalledWith('browser-token');
    expect(messaging.deleteToken).toHaveBeenCalled();
    expect(localStorage.getItem('pf:web-push:ash')).toBeNull();
  });

  it('al cerrar sesión da de baja el token pero recuerda que las quería', async () => {
    localStorage.setItem('pf:web-push:ash', 'browser-token');

    await forgetWebPushOnLogout('ash');

    expect(api.unregisterPushToken).toHaveBeenCalledWith('browser-token');
    expect(localStorage.getItem('pf:web-push:ash')).toBe('browser-token');
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
