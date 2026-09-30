import { Capacitor } from '@capacitor/core';
import { pushTokenKey, type WebPushEnv } from '../utils/webPush';
import { webPushConfigured } from './config';

/** localStorage que nunca lanza (modo privado, almacenamiento bloqueado). */
export const storage = {
  get(key: string): string | null {
    try { return localStorage.getItem(key); } catch { return null; }
  },
  set(key: string, value: string) {
    try { localStorage.setItem(key, value); } catch { /* sin almacenamiento: no se recuerda */ }
  },
  remove(key: string) {
    try { localStorage.removeItem(key); } catch { /* idem */ }
  },
};

/** Lo que el navegador permite ahora mismo, para `webPushStatus`. */
export function readWebPushEnv(username: string | null): WebPushEnv {
  const ua = navigator.userAgent;
  // iPadOS se presenta como Mac: se distingue por la pantalla táctil
  const ios = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const standalone = window.matchMedia?.('(display-mode: standalone)').matches
    || (navigator as Navigator & { standalone?: boolean }).standalone === true;
  const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  return {
    native: Capacitor.isNativePlatform(),
    configured: webPushConfigured(),
    supported,
    ios,
    standalone: !!standalone,
    permission: supported ? Notification.permission : 'unsupported',
    enabled: !!username && !!storage.get(pushTokenKey(username)),
  };
}
