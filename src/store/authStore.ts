import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { logout as apiLogout } from '../api/auth';
import { useToastStore } from './toastStore';

interface AuthState {
  username: string | null;
  setAuth: (username: string) => void;
  logout: () => void;
  /** El backend dice que no hay sesión: se olvida el usuario y `ProtectedRoute` lleva al login. */
  expireSession: () => void;
  isAuthenticated: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      username: null,
      setAuth: (username) => set({ username }),
      logout: () => {
        set({ username: null });
        apiLogout().catch(() => {});
      },
      expireSession: () => {
        if (!get().username) return;
        set({ username: null });
        useToastStore.getState().addToast('info', 'Tu sesión ha caducado. Vuelve a entrar.');
      },
      isAuthenticated: () => !!get().username,
    }),
    { name: 'auth-storage' }
  )
);
