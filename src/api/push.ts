import { apiClient } from './client';

/** Registra el token FCM de este dispositivo (app o navegador) para el usuario en sesión. */
export const registerPushToken = async (token: string): Promise<void> => {
  await apiClient.post('/v1/users/push-token', { token });
};

/** Da de baja este dispositivo: deja de recibir avisos (solo se quita al usuario en sesión). */
export const unregisterPushToken = async (token: string): Promise<void> => {
  await apiClient.delete('/v1/users/push-token', { data: { token } });
};
