import { describe, it, expect } from 'vitest';
import { leagueNameError } from './leagueName';

describe('leagueNameError', () => {
  it('accepts 1 to 40 characters once trimmed (same rule as the backend LeagueNamePolicy)', () => {
    expect(leagueNameError('Kanto')).toBeNull();
    expect(leagueNameError('  Kanto  ')).toBeNull();
    expect(leagueNameError('x'.repeat(40))).toBeNull();
  });

  it('rejects blank, too long and control characters', () => {
    expect(leagueNameError('   ')).toBe('El nombre de la liga debe tener entre 1 y 40 caracteres.');
    expect(leagueNameError('x'.repeat(41))).toBe('El nombre de la liga debe tener entre 1 y 40 caracteres.');
    expect(leagueNameError('Kan\nto')).toBe('El nombre de la liga no puede tener saltos de línea ni caracteres de control.');
  });
});
