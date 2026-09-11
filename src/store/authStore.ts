import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { logout as apiLogout } from '../api/auth';

interface AuthState {
  username: string | null;
  setAuth: (username: string) => void;
  logout: () => void;
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
      isAuthenticated: () => !!get().username,
    }),
    { name: 'auth-storage' }
  )
);
