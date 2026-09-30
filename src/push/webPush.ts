import { registerPushToken, unregisterPushToken } from '../api/push';
import { isOtherAccountPushKey, pushDismissedKey, pushTokenKey } from '../utils/webPush';
import { firebaseWebConfig } from './config';
import { storage } from './env';

export const SW_URL = '/firebase-messaging-sw.js';

/** Firebase se carga solo aquí y bajo demanda: la web no lo descarga si nadie activa los avisos. */
async function messagingInstance() {
  const settings = firebaseWebConfig();
  if (!settings) throw new Error('Firebase sin configurar');
  const [{ getApps, initializeApp }, { getMessaging }] = await Promise.all([
    import('firebase/app'),
    import('firebase/messaging'),
  ]);
  const app = getApps()[0] ?? initializeApp(settings.config);
  return { messaging: getMessaging(app), vapidKey: settings.vapidKey };
}

async function browserToken(): Promise<string> {
  const registration = await navigator.serviceWorker.register(SW_URL);
  const { messaging, vapidKey } = await messagingInstance();
  const { getToken } = await import('firebase/messaging');
  return getToken(messaging, { vapidKey, serviceWorkerRegistration: registration });
}

/**
 * Anula la suscripción push de este navegador (hay una sola, compartida por las cuentas que entren en él):
 * FCM da su token por caducado y el back lo borra en el siguiente envío. Sin Firebase: su `deleteToken`
 * registraría otro service worker en su scope por defecto.
 */
async function dropBrowserSubscription(): Promise<void> {
  if (!('serviceWorker' in navigator)) return;
  const registration = await navigator.serviceWorker.getRegistration();
  const subscription = await registration?.pushManager.getSubscription();
  await subscription?.unsubscribe();
}

/**
 * Activa los avisos en este navegador. Llamarla directamente desde el clic: pedir el permiso es lo primero
 * (Safari solo lo concede dentro del gesto del usuario, antes de cualquier espera).
 */
export async function enableWebPush(username: string): Promise<'enabled' | 'blocked' | 'off'> {
  const permission = await Notification.requestPermission();
  if (permission === 'denied') return 'blocked';
  if (permission !== 'granted') return 'off';
  const token = await browserToken();
  await registerPushToken(token);
  storage.set(pushTokenKey(username), token);
  return 'enabled';
}

/** Desactiva los avisos de este usuario en este navegador. */
export async function disableWebPush(username: string): Promise<void> {
  const token = storage.get(pushTokenKey(username));
  storage.remove(pushTokenKey(username));
  if (token) await unregisterPushToken(token).catch(() => {});
  await dropBrowserSubscription().catch(() => {});
}

/** Al entrar o al abrir la web: si este usuario las tenía activadas, vuelve a registrar el token (puede rotar). */
export async function resumeWebPush(username: string): Promise<void> {
  if (!storage.get(pushTokenKey(username))) {
    // Otra cuenta los tenía aquí y quizá no cerró sesión (caducó): su token sigue a su nombre en el back y
    // este navegador mostraría sus avisos a quien acaba de entrar
    if (storage.keys().some((key) => isOtherAccountPushKey(key, username))) {
      await dropBrowserSubscription();
    }
    return;
  }
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
  if (!firebaseWebConfig()) return;
  const token = await browserToken();
  await registerPushToken(token);
  storage.set(pushTokenKey(username), token);
}

/**
 * Al cerrar sesión (antes de cerrarla en el back, que necesita la cookie): este navegador deja de recibir
 * los avisos de esta cuenta. La preferencia se queda para reanudarlos si vuelve a entrar.
 */
export async function forgetWebPushOnLogout(username: string): Promise<void> {
  const token = storage.get(pushTokenKey(username));
  if (token) await unregisterPushToken(token).catch(() => {});
}

export const dismissWebPushPrompt = (username: string) => storage.set(pushDismissedKey(username), '1');
export const isWebPushPromptDismissed = (username: string) => storage.get(pushDismissedKey(username)) === '1';
