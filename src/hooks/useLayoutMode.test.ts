import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { Capacitor } from '@capacitor/core';
import { MOBILE_MAX_WIDTH, MOBILE_QUERY, useLayoutMode } from './useLayoutMode';

vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: vi.fn(() => false) } }));

type Listener = () => void;

/** matchMedia falso: `set(true)` cambia el resultado y avisa a los suscritos como el navegador. */
function installMatchMedia(initial: boolean) {
  const listeners = new Set<Listener>();
  const mql = {
    matches: initial,
    addEventListener: vi.fn((_: string, l: Listener) => listeners.add(l)),
    removeEventListener: vi.fn((_: string, l: Listener) => listeners.delete(l)),
  };
  const matchMedia = vi.fn(() => mql);
  Object.defineProperty(window, 'matchMedia', { configurable: true, writable: true, value: matchMedia });
  return {
    matchMedia,
    mql,
    set(matches: boolean) {
      mql.matches = matches;
      listeners.forEach((l) => l());
    },
  };
}

describe('useLayoutMode', () => {
  beforeEach(() => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);
  });

  afterEach(() => {
    delete (window as { matchMedia?: unknown }).matchMedia;
  });

  it('usa el breakpoint móvil de 767px', () => {
    expect(MOBILE_MAX_WIDTH).toBe(767);
    expect(MOBILE_QUERY).toBe('(max-width: 767px)');
  });

  it('devuelve desktop si la consulta no coincide', () => {
    const { matchMedia } = installMatchMedia(false);
    const { result } = renderHook(() => useLayoutMode());
    expect(result.current).toBe('desktop');
    expect(matchMedia).toHaveBeenCalledWith(MOBILE_QUERY);
  });

  it('devuelve mobile si la consulta coincide', () => {
    installMatchMedia(true);
    const { result } = renderHook(() => useLayoutMode());
    expect(result.current).toBe('mobile');
  });

  it('cambia de modo al cambiar el ancho', () => {
    const media = installMatchMedia(false);
    const { result } = renderHook(() => useLayoutMode());
    act(() => media.set(true));
    expect(result.current).toBe('mobile');
  });

  it('en la app nativa siempre es mobile, aunque la pantalla sea ancha', () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
    installMatchMedia(false);
    const { result } = renderHook(() => useLayoutMode());
    expect(result.current).toBe('mobile');
  });

  it('sin matchMedia devuelve desktop sin fallar', () => {
    const { result } = renderHook(() => useLayoutMode());
    expect(result.current).toBe('desktop');
  });

  it('se da de baja al desmontar', () => {
    const { mql } = installMatchMedia(false);
    const { unmount } = renderHook(() => useLayoutMode());
    const listener = mql.addEventListener.mock.calls[0][1];
    unmount();
    expect(mql.removeEventListener).toHaveBeenCalledWith('change', listener);
  });
});
