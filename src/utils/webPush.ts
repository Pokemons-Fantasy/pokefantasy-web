/** Estado de los avisos push en este navegador para el usuario en sesión. */
export type WebPushStatus =
  | 'hidden'        // app nativa (tiene los suyos) o Firebase sin configurar: no se ofrece nada
  | 'unsupported'   // el navegador no admite push
  | 'needs-install' // iPhone/iPad en Safari: solo con la web en la pantalla de inicio
  | 'blocked'       // permiso denegado: solo se desbloquea en los ajustes del navegador
  | 'enabled'
  | 'off';          // se puede activar

export interface WebPushEnv {
  native: boolean;
  configured: boolean;
  supported: boolean;
  ios: boolean;
  standalone: boolean;
  permission: NotificationPermission | 'unsupported';
  /** Este usuario las activó en este navegador (hay token guardado). */
  enabled: boolean;
}

export function webPushStatus(env: WebPushEnv): WebPushStatus {
  if (env.native || !env.configured) return 'hidden';
  if (env.ios && !env.standalone) return 'needs-install';
  if (!env.supported) return 'unsupported';
  if (env.permission === 'denied') return 'blocked';
  if (env.enabled && env.permission === 'granted') return 'enabled';
  return 'off';
}

/** El aviso propio sale mientras se puede activar (o instalar) y no se ha dicho "Ahora no". */
export function shouldPrompt(status: WebPushStatus, dismissed: boolean): boolean {
  return (status === 'off' || status === 'needs-install') && !dismissed;
}

/** Token registrado por este usuario en este navegador (su presencia = activadas). */
export const pushTokenKey = (username: string) => `pf:web-push:${username}`;
/** "Ahora no" de este usuario en este navegador. */
export const pushDismissedKey = (username: string) => `pf:web-push-dismissed:${username}`;
/** Clave de los avisos activados por otra cuenta en este navegador (no los propios ni sus "Ahora no"). */
export const isOtherAccountPushKey = (key: string, username: string) =>
  key.startsWith(pushTokenKey('')) && key !== pushTokenKey(username);
