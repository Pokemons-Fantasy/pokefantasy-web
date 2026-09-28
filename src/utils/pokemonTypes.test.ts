import { describe, it, expect } from 'vitest';
import { typeLabel } from './pokemonTypes';

describe('typeLabel', () => {
  it('nombre del tipo en los juegos en España', () => {
    expect(typeLabel('grass')).toBe('Planta');
    expect(typeLabel('poison')).toBe('Veneno');
    expect(typeLabel('dark')).toBe('Siniestro');
    expect(typeLabel('fairy')).toBe('Hada');
  });

  it('no distingue mayúsculas', () => {
    expect(typeLabel('Fire')).toBe('Fuego');
  });

  it('un tipo desconocido se muestra tal cual', () => {
    expect(typeLabel('stellar')).toBe('stellar');
  });
});
