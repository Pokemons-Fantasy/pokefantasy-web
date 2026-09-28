import { describe, it, expect, beforeEach } from 'vitest';
import { useAuthStore } from './authStore';
import { useToastStore } from './toastStore';

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
