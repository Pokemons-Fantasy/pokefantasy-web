import { describe, it, expect } from 'vitest';
import { deriveTeams } from './teams';
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
