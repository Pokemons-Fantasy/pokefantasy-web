import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useAuthStore } from './authStore';
import { useToastStore } from './toastStore';

vi.mock('../api/auth', () => ({ logout: vi.fn().mockResolvedValue(undefined) }));

describe('authStore.expireSession', () => {
  beforeEach(() => useToastStore.setState({ toasts: [] }));

  it('forgets the user (ProtectedRoute then sends to /login with from) and says why', () => {
    useAuthStore.setState({ username: 'ash' });
    useAuthStore.getState().expireSession();
    expect(useAuthStore.getState().username).toBeNull();
    expect(useToastStore.getState().toasts.map((t) => t.message)).toEqual(['Tu sesión ha caducado. Vuelve a entrar.']);
  });

  it('does nothing when nobody is logged in (e.g. the cookie check right after login)', () => {
    useAuthStore.setState({ username: null });
    useAuthStore.getState().expireSession();
    expect(useToastStore.getState().toasts).toEqual([]);
  });
});

describe('authStore: última sesión', () => {
  beforeEach(() => {
    useAuthStore.setState({ username: 'ash', lastSession: null });
    window.history.pushState({}, '', '/leagues/l1/teams?tab=bench');
  });

  it('al cerrar sesión recuerda quién era y en qué página estaba', () => {
    useAuthStore.getState().logout();
    expect(useAuthStore.getState().lastSession).toEqual({ user: 'ash', path: '/leagues/l1/teams?tab=bench' });
  });

  it('al caducar la sesión, también', () => {
    useAuthStore.getState().expireSession();
    expect(useAuthStore.getState().lastSession).toEqual({ user: 'ash', path: '/leagues/l1/teams?tab=bench' });
  });

  it('al iniciar sesión se olvida', () => {
    useAuthStore.getState().logout();
    useAuthStore.getState().setAuth('misty');
    expect(useAuthStore.getState().lastSession).toBeNull();
  });
});
