import { describe, it, expect, beforeEach, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useDraftFavorites } from './useDraftFavorites';

describe('useDraftFavorites', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('marca y desmarca, y se recuerda para ese usuario y liga', () => {
    const { result, unmount } = renderHook(() => useDraftFavorites('ash', 'l1'));
    act(() => result.current.toggle('mewtwo'));
    act(() => result.current.toggle('onix'));
    act(() => result.current.toggle('onix'));
    expect([...result.current.favorites]).toEqual(['mewtwo']);
    unmount();

    expect([...renderHook(() => useDraftFavorites('ash', 'l1')).result.current.favorites]).toEqual(['mewtwo']);
    expect(renderHook(() => useDraftFavorites('brock', 'l1')).result.current.favorites.size).toBe(0);
    expect(renderHook(() => useDraftFavorites('ash', 'l2')).result.current.favorites.size).toBe(0);
  });

  it('sin almacenamiento o con datos rotos funciona igual, solo en memoria', () => {
    localStorage.setItem('pf:draft-favorites:ash:l1', '{roto');
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('bloqueado'); });
    const { result } = renderHook(() => useDraftFavorites('ash', 'l1'));
    expect(result.current.favorites.size).toBe(0);
    act(() => result.current.toggle('mewtwo'));
    expect(result.current.favorites.has('mewtwo')).toBe(true);
  });
});
