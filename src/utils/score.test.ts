import { describe, it, expect } from 'vitest';
import { formatDiff, parseScore, scoreLabel } from './score';

describe('parseScore', () => {
  it('empty means no score', () => {
    expect(parseScore('', ' ')).toEqual({ score: null, error: null });
  });

  it('parses a valid score', () => {
    expect(parseScore('3', '1')).toEqual({ score: { winnerScore: 3, loserScore: 1 }, error: null });
    expect(parseScore('1', '0').score).toEqual({ winnerScore: 1, loserScore: 0 });
  });

  it('rejects half-filled, invalid, out of range and non-winning scores', () => {
    expect(parseScore('3', '').error).toMatch(/los dos/);
    expect(parseScore('a', '1').error).toMatch(/entre 0 y 99/);
    expect(parseScore('1.5', '1').error).toMatch(/entre 0 y 99/);
    expect(parseScore('100', '1').error).toMatch(/entre 0 y 99/);
    expect(parseScore('3', '-1').error).toMatch(/entre 0 y 99/);
    expect(parseScore('2', '2').error).toMatch(/más que el perdedor/);
    expect(parseScore('1', '3').error).toMatch(/más que el perdedor/);
  });
});

describe('scoreLabel', () => {
  it('orders the score as player1–player2', () => {
    expect(scoreLabel({ player1: 'ash', winnerUsername: 'ash', winnerScore: 3, loserScore: 1 })).toBe('3–1');
    expect(scoreLabel({ player1: 'ash', winnerUsername: 'brock', winnerScore: 3, loserScore: 1 })).toBe('1–3');
  });

  it('null without score', () => {
    expect(scoreLabel({ player1: 'ash', winnerUsername: 'ash' })).toBeNull();
    expect(scoreLabel({ player1: 'ash', winnerScore: 3, loserScore: 1 })).toBeNull();
  });
});

describe('formatDiff', () => {
  it('adds the sign', () => {
    expect(formatDiff(3)).toBe('+3');
    expect(formatDiff(-2)).toBe('−2');
    expect(formatDiff(0)).toBe('0');
  });
});
