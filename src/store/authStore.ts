import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { logout as apiLogout } from '../api/auth';
import { forgetWebPushOnLogout } from '../push/webPush';
import { useToastStore } from './toastStore';
import type { LastSession } from '../utils/session';

interface AuthState {
  username: string | null;
  /** Quién estaba y en qué página cuando terminó la última sesión (ver `loginDestination`). */
  lastSession: LastSession | null;
  setAuth: (username: string) => void;
  logout: () => void;
  /** El backend dice que no hay sesión: se olvida el usuario y `ProtectedRoute` lleva al login. */
  expireSession: () => void;
  isAuthenticated: () => boolean;
}

/** La página actual, para recordar dónde terminó la sesión. */
const currentPath = () => `${window.location.pathname}${window.location.search}`;

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      username: null,
      lastSession: null,
      setAuth: (username) => set({ username, lastSession: null }),
      logout: () => {
        const user = get().username;
        set({ username: null, lastSession: user ? { user, path: currentPath() } : null });
        // Antes de cerrar la sesión en el back (necesita la cookie): este navegador deja de recibir sus avisos
        const forget = user ? forgetWebPushOnLogout(user) : Promise.resolve();
        forget.catch(() => {}).finally(() => { apiLogout().catch(() => {}); });
      },
      expireSession: () => {
        const user = get().username;
        if (!user) return;
        set({ username: null, lastSession: { user, path: currentPath() } });
        useToastStore.getState().addToast('info', 'Tu sesión ha caducado. Vuelve a entrar.');
      },
      isAuthenticated: () => !!get().username,
    }),
    { name: 'auth-storage' }
  )
);
