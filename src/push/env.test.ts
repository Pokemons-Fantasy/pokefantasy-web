import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readWebPushEnv, storage } from './env';

describe('push/env', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.unstubAllEnvs());

  it('"activadas" es de cada usuario en este navegador', () => {
    localStorage.setItem('pf:web-push:ash', 'tok');
    expect(readWebPushEnv('ash').enabled).toBe(true);
    expect(readWebPushEnv('brock').enabled).toBe(false);
    expect(readWebPushEnv(null).enabled).toBe(false);
  });

  it('sin las VITE_FIREBASE_* no está configurado', () => {
    vi.stubEnv('VITE_FIREBASE_API_KEY', '');
    expect(readWebPushEnv('ash').configured).toBe(false);
  });

  it('el almacenamiento no lanza aunque localStorage falle', () => {
    const fail = () => { throw new Error('bloqueado'); };
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(fail);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(fail);
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(fail);
    expect(storage.get('k')).toBeNull();
    expect(() => { storage.set('k', 'v'); storage.remove('k'); }).not.toThrow();
    vi.restoreAllMocks();
  });
});
