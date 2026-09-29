import { describe, it, expect } from 'vitest';
import { sameSetup, setupError, type SetupForm } from './draftSetup';

const FORM: SetupForm = {
  budget: 1000, priceS: 200, priceA: 150, priceB: 100, priceC: 60, priceD: 30, snake: false, turnOrder: ['ash', 'misty'],
};

describe('sameSetup', () => {
  it('compara números, snake y orden', () => {
    expect(sameSetup(FORM, { ...FORM, turnOrder: ['ash', 'misty'] })).toBe(true);
    expect(sameSetup(FORM, { ...FORM, priceD: 0 })).toBe(false);
    expect(sameSetup(FORM, { ...FORM, snake: true })).toBe(false);
    expect(sameSetup(FORM, { ...FORM, turnOrder: ['misty', 'ash'] })).toBe(false);
    expect(sameSetup(FORM, { ...FORM, turnOrder: ['ash', 'misty', 'brock'] })).toBe(false);
  });
});

describe('setupError', () => {
  it('presupuesto positivo y precios enteros no negativos', () => {
    expect(setupError(FORM)).toBeNull();
    expect(setupError({ ...FORM, budget: 0 })).toBe('El presupuesto tiene que ser mayor que 0');
    expect(setupError({ ...FORM, priceA: -1 })).toBe('Los precios no pueden ser negativos');
    expect(setupError({ ...FORM, priceB: 1.5 })).toBe('Los precios tienen que ser números enteros');
  });
});
