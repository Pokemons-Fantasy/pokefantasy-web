import { describe, expect, it } from 'vitest';
import type { Lineup, MatchDto } from '../api/leagues';
import { lineupSize, lineupState, myLineup, rivalLineup } from './lineup';

const ASH: Lineup = { pokemonNames: ['pikachu'] };
const MISTY: Lineup = { pokemonNames: ['starmie'] };

function match(extra: Partial<MatchDto>): MatchDto {
  return { id: 'm1', player1: 'ash', player2: 'misty', status: 'PENDING', ...extra };
}

describe('lineupSize', () => {
  it('6, o el equipo entero si es más pequeño', () => {
    expect(lineupSize(20)).toBe(6);
    expect(lineupSize(4)).toBe(4);
  });
});

describe('myLineup / rivalLineup', () => {
  it('la de mi lado y la del otro, sea player1 o player2', () => {
    const m = match({ player1Lineup: ASH, player2Lineup: MISTY });
    expect(myLineup(m, 'ash')).toBe(ASH);
    expect(rivalLineup(m, 'ash')).toBe(MISTY);
    expect(myLineup(m, 'misty')).toBe(MISTY);
    expect(rivalLineup(m, 'misty')).toBe(ASH);
  });

  it('null si no juego el partido o no ha llegado', () => {
    expect(myLineup(match({ player1Lineup: ASH }), 'brock')).toBeNull();
    expect(rivalLineup(match({}), 'ash')).toBeNull();
  });
});

describe('lineupState', () => {
  it('los cuatro estados desde mi lado', () => {
    expect(lineupState(match({}), 'ash')).toBe('none');
    expect(lineupState(match({ player1LineupSubmitted: true }), 'ash')).toBe('waiting-rival');
    expect(lineupState(match({ player2LineupSubmitted: true }), 'ash')).toBe('waiting-me');
    expect(lineupState(match({ player1LineupSubmitted: true, player2LineupSubmitted: true }), 'ash')).toBe('revealed');
  });

  it('el rival ve los estados al revés', () => {
    expect(lineupState(match({ player1LineupSubmitted: true }), 'misty')).toBe('waiting-me');
  });

  it('quien no juega solo distingue revelada del resto', () => {
    expect(lineupState(match({ player1LineupSubmitted: true }), 'brock')).toBe('none');
    expect(lineupState(match({ player1LineupSubmitted: true, player2LineupSubmitted: true }), 'brock')).toBe('revealed');
  });
});
