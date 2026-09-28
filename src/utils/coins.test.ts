import { describe, it, expect } from 'vitest';
import { coinsLabel } from './coins';

describe('coinsLabel', () => {
  it('singular solo con una moneda', () => {
    expect(coinsLabel(1)).toBe('1 moneda');
    expect(coinsLabel(-1)).toBe('-1 moneda');
  });

  it('plural en el resto, también con cero', () => {
    expect(coinsLabel(0)).toBe('0 monedas');
    expect(coinsLabel(12)).toBe('12 monedas');
  });
});
