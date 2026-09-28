import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useLastSeen } from './useLastSeen';

describe('useLastSeen', () => {
  beforeEach(() => localStorage.clear());

  it('devuelve lo guardado al abrir y guarda lo más reciente para la próxima vez', () => {
    localStorage.setItem('k', '2026-09-27T10:00:00Z');
    const { result, rerender } = renderHook(({ latest }) => useLastSeen('k', latest), {
      initialProps: { latest: undefined as string | undefined },
    });
    expect(result.current).toBe('2026-09-27T10:00:00Z');

    rerender({ latest: '2026-09-28T14:00:00Z' });
    expect(localStorage.getItem('k')).toBe('2026-09-28T14:00:00Z');
    expect(result.current).toBe('2026-09-27T10:00:00Z'); // el de esta visita no cambia
  });

  it('no retrocede si llega un evento más antiguo (por ejemplo, con un filtro)', () => {
    localStorage.setItem('k', '2026-09-28T14:00:00Z');
    renderHook(() => useLastSeen('k', '2026-09-20T10:00:00Z'));
    expect(localStorage.getItem('k')).toBe('2026-09-28T14:00:00Z');
  });

  it('primera visita: null', () => {
    const { result } = renderHook(() => useLastSeen('k', undefined));
    expect(result.current).toBeNull();
  });
});
