import { describe, it, expect } from 'vitest';
import { deriveTeams, isPickLocked, lockRemaining, lockedUntilLabel } from './teams';
import type { DraftStatus, DraftPick } from '../api/pokemons';

function pick(username: string, pokemonId: number, pokemonName = `mon-${pokemonId}`): DraftPick {
  return { username, pokemonName, pokemonId, round: 1, pickedAt: '2026-01-01T00:00:00Z' };
}

function draft(turnOrder: string[], picks: DraftPick[]): DraftStatus {
  return {
    id: 'draft-1',
    status: 'COMPLETED',
    turnOrder,
    currentTurn: null,
    currentRound: 1,
    picks,
  };
}

describe('deriveTeams', () => {
  it('returns an empty array when there is no draft', () => {
    expect(deriveTeams(null)).toEqual([]);
    expect(deriveTeams(undefined)).toEqual([]);
  });

  it('creates one team per player in turnOrder, even with zero picks', () => {
    const teams = deriveTeams(draft(['ash', 'brock'], []));
    expect(teams).toEqual([
      { username: 'ash', picks: [] },
      { username: 'brock', picks: [] },
    ]);
  });

  it('assigns each pick to its owner based on draft.picks — the source of truth, not any other state', () => {
    const teams = deriveTeams(
      draft(['ash', 'brock'], [pick('brock', 7), pick('ash', 25), pick('ash', 1)])
    );

    const ash = teams.find((t) => t.username === 'ash')!;
    const brock = teams.find((t) => t.username === 'brock')!;
    expect(ash.picks.map((p) => p.pokemonId)).toEqual([1, 25]); // sorted by pokemonId
    expect(brock.picks.map((p) => p.pokemonId)).toEqual([7]);
  });

  it('reflects a steal/swap that changed ownership in draft.picks (not a separate team list)', () => {
    // ash originally had #25, but it was stolen — draft.picks now shows brock as owner.
    const teams = deriveTeams(draft(['ash', 'brock'], [pick('brock', 25)]));

    const ash = teams.find((t) => t.username === 'ash')!;
    const brock = teams.find((t) => t.username === 'brock')!;
    expect(ash.picks).toEqual([]);
    expect(brock.picks.map((p) => p.pokemonId)).toEqual([25]);
  });

  it('handles draft.picks being null/undefined defensively', () => {
    const d = draft(['ash'], []);
    // @ts-expect-error simulating a malformed API response
    d.picks = null;
    expect(deriveTeams(d)).toEqual([{ username: 'ash', picks: [] }]);
  });
});

describe('isPickLocked', () => {
  it('returns false when lockedUntil is not set', () => {
    expect(isPickLocked({ lockedUntil: null })).toBe(false);
    expect(isPickLocked({ lockedUntil: undefined })).toBe(false);
  });

  it('returns true when lockedUntil is in the future', () => {
    const future = new Date(Date.now() + 60_000).toISOString();
    expect(isPickLocked({ lockedUntil: future })).toBe(true);
  });

  it('returns false when lockedUntil is in the past', () => {
    const past = new Date(Date.now() - 60_000).toISOString();
    expect(isPickLocked({ lockedUntil: past })).toBe(false);
  });
});

describe('lockRemaining', () => {
  const now = new Date('2026-10-14T10:00:00Z');
  const at = (ms: number) => new Date(now.getTime() + ms).toISOString();
  const MIN = 60_000;
  const HOUR = 60 * MIN;

  it('sin bloqueo o ya vencido devuelve null', () => {
    expect(lockRemaining(null, now)).toBeNull();
    expect(lockRemaining(undefined, now)).toBeNull();
    expect(lockRemaining(at(0), now)).toBeNull();
    expect(lockRemaining(at(-MIN), now)).toBeNull();
  });

  it('con días muestra días y horas', () => {
    expect(lockRemaining(at(2 * 24 * HOUR + 5 * HOUR + 30 * MIN), now)).toBe('2d 5h');
    expect(lockRemaining(at(7 * 24 * HOUR), now)).toBe('7d');
  });

  it('con menos de un día muestra horas', () => {
    expect(lockRemaining(at(5 * HOUR + 59 * MIN), now)).toBe('5h');
    expect(lockRemaining(at(HOUR), now)).toBe('1h');
  });

  it('con menos de una hora muestra minutos, como mínimo 1', () => {
    expect(lockRemaining(at(25 * MIN), now)).toBe('25 min');
    expect(lockRemaining(at(10_000), now)).toBe('1 min');
  });
});

describe('lockedUntilLabel', () => {
  it('da el día y la hora local del desbloqueo', () => {
    const until = new Date(2026, 9, 17, 21, 30);
    expect(lockedUntilLabel(until.toISOString())).toBe('Bloqueado hasta sáb 17 oct 21:30');
  });
});
