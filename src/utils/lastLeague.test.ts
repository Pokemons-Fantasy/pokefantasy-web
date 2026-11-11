import { afterEach, describe, expect, it, vi } from 'vitest';
import { getLastLeague, setLastLeague } from './lastLeague';

describe('lastLeague', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('guarda y lee la última liga', () => {
    setLastLeague('abc');
    expect(getLastLeague()).toBe('abc');
  });

  it('sin nada guardado devuelve null', () => {
    expect(getLastLeague()).toBeNull();
  });

  it('si el almacenamiento falla, ni lee ni lanza', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('bloqueado'); });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('bloqueado'); });
    expect(getLastLeague()).toBeNull();
    expect(() => setLastLeague('abc')).not.toThrow();
  });
});
