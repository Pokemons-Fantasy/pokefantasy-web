import axios from 'axios';
import { Capacitor } from '@capacitor/core';
import { resolveApiBaseUrl } from '../utils/apiBaseUrl';
import { isSessionExpired } from '../utils/session';

export const API_BASE_URL = resolveApiBaseUrl(import.meta.env.VITE_API_URL, Capacitor.isNativePlatform());

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

/** Ejecuta `handler` cada vez que el backend responde que no hay sesión. Devuelve la función para quitarlo. */
export function onSessionExpired(handler: () => void): () => void {
  const id = apiClient.interceptors.response.use(undefined, (error) => {
    if (isSessionExpired(error)) handler();
    return Promise.reject(error);
  });
  return () => apiClient.interceptors.response.eject(id);
}
