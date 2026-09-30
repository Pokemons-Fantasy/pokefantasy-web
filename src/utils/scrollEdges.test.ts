import { describe, it, expect } from 'vitest';
import { scrollEdges } from './scrollEdges';

describe('scrollEdges', () => {
  it('sin desbordar no hay nada oculto', () => {
    expect(scrollEdges({ scrollLeft: 0, clientWidth: 300, scrollWidth: 300 })).toEqual({ start: false, end: false });
  });

  it('al principio solo queda contenido a la derecha', () => {
    expect(scrollEdges({ scrollLeft: 0, clientWidth: 300, scrollWidth: 800 })).toEqual({ start: false, end: true });
  });

  it('a mitad, a los dos lados; al final, solo a la izquierda', () => {
    expect(scrollEdges({ scrollLeft: 200, clientWidth: 300, scrollWidth: 800 })).toEqual({ start: true, end: true });
    expect(scrollEdges({ scrollLeft: 499.6, clientWidth: 300, scrollWidth: 800 })).toEqual({ start: true, end: false });
  });
});
