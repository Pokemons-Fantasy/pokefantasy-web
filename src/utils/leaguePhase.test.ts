import { describe, it, expect } from 'vitest';
import { leaguePhase, LEAGUE_PHASES } from './leaguePhase';
describe('leaguePhase', () => {
  it('sin draft o pendiente es preparación', () => {
    expect(leaguePhase(undefined)).toBe('setup');
    expect(leaguePhase(null)).toBe('setup');
    expect(leaguePhase('PENDING')).toBe('setup');
  });

  it('draft en curso', () => {
    expect(leaguePhase('IN_PROGRESS')).toBe('draft');
  });

  it('draft completado es temporada', () => {
    expect(leaguePhase('COMPLETED')).toBe('season');
  });

  it('draft cancelado', () => {
    expect(leaguePhase('CANCELLED')).toBe('cancelled');
  });

  it('cada fase tiene etiqueta y variante de badge', () => {
    expect(LEAGUE_PHASES.season).toEqual({ label: 'Temporada', badge: 'info' });
    expect(LEAGUE_PHASES.draft.badge).toBe('green');
  });
});
