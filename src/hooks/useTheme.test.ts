import { describe, it, expect, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useTheme } from './useTheme';

describe('useTheme', () => {
  beforeEach(() => {
    localStorage.clear();
    document.head.innerHTML = '<meta name="theme-color" content="#0a0a0f" />';
  });

  it('la barra del navegador (theme-color) sigue al tema de la app', () => {
    const meta = () => document.querySelector('meta[name="theme-color"]')!.getAttribute('content');
    const { result } = renderHook(() => useTheme());
    expect(meta()).toBe('#0a0a0f');

    act(() => result.current.toggle());

    expect(result.current.theme).toBe('light');
    expect(meta()).toBe('#f4f4f8');
    expect(document.documentElement).toHaveClass('theme-light');
  });
});
