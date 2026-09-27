import { describe, it, expect } from 'vitest';
import { leaguePhase, LEAGUE_PHASES, homeFocus } from './leaguePhase';
import type { League, LeagueDraftStatus } from '../api/leagues';

const league = (id: string, draftStatus?: LeagueDraftStatus): League =>
  ({ id, name: id, createdBy: 'ash', memberCount: 2, status: 'SETUP', draftStatus });

describe('homeFocus', () => {
  it('sin ligas no hay foco', () => {
    expect(homeFocus([])).toBeNull();
  });

  it('un draft en curso manda sobre setup y temporada', () => {
    const focus = homeFocus([league('a', 'COMPLETED'), league('b', 'PENDING'), league('c', 'IN_PROGRESS')]);
    expect(focus?.phase).toBe('draft');
    expect(focus?.leagues.map((l) => l.id)).toEqual(['c']);
  });

  it('setup (incluido cancelado y backend sin draftStatus) antes que temporada', () => {
    const focus = homeFocus([league('a', 'COMPLETED'), league('b', 'CANCELLED'), league('c')]);
    expect(focus?.phase).toBe('setup');
    expect(focus?.leagues.map((l) => l.id)).toEqual(['b', 'c']);
  });

  it('todas en temporada', () => {
    expect(homeFocus([league('a', 'COMPLETED')])?.phase).toBe('season');
  });
});

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
