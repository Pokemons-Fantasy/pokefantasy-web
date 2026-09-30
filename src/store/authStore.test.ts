import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useAuthStore } from './authStore';
import { useToastStore } from './toastStore';
import * as webPush from '../push/webPush';
import * as auth from '../api/auth';

vi.mock('../api/auth', () => ({ logout: vi.fn().mockResolvedValue(undefined) }));
vi.mock('../push/webPush', () => ({ forgetWebPushOnLogout: vi.fn().mockResolvedValue(undefined) }));

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

describe('authStore: avisos web al cerrar sesión', () => {
  it('da de baja el token de este navegador antes de cerrar la sesión en el back', async () => {
    const calls: string[] = [];
    vi.mocked(webPush.forgetWebPushOnLogout).mockImplementation(async () => { calls.push('forget'); });
    vi.mocked(auth.logout).mockImplementation(async () => { calls.push('logout'); });
    useAuthStore.setState({ username: 'ash' });

    useAuthStore.getState().logout();
    await vi.waitFor(() => expect(calls).toEqual(['forget', 'logout']));
    expect(webPush.forgetWebPushOnLogout).toHaveBeenCalledWith('ash');
  });
});
