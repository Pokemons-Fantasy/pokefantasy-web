import { apiClient } from './client';

/** Registra el token FCM de este dispositivo (app o navegador) para el usuario en sesión. */
export const registerPushToken = async (token: string): Promise<void> => {
  await apiClient.post('/v1/users/push-token', { token });
};

/**
 * Tope de la baja: al cerrar sesión va antes del logout del back, y con el back despertando en Render podría
 * tardar un minuto. Si no llega, la suscripción del navegador ya está anulada y el back borra el token en el
 * siguiente envío.
 */
export const UNREGISTER_TIMEOUT_MS = 5000;

/** Da de baja este dispositivo: deja de recibir avisos (solo se quita al usuario en sesión). */
export const unregisterPushToken = async (token: string): Promise<void> => {
  await apiClient.delete('/v1/users/push-token', { data: { token }, timeout: UNREGISTER_TIMEOUT_MS });
};
