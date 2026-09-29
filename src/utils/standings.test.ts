import { describe, it, expect } from 'vitest';
import { recentForm, tiebreaks } from './standings';
import type { MatchDto, PlayerStanding, ScheduleResponse } from '../api/leagues';

const row = (username: string, wins: number, scoreDiff = 0, coins = 0): PlayerStanding => ({
  username, wins, losses: 0, played: wins, coins, scoreFor: 0, scoreAgainst: 0, scoreDiff,
});

describe('tiebreaks', () => {
  it('sin empates a victorias no marca a nadie', () => {
    expect(tiebreaks([row('a', 3), row('b', 2), row('c', 1)]).size).toBe(0);
  });

  it('marca la diferencia si decide, y las monedas si la diferencia es igual', () => {
    const result = tiebreaks([row('a', 2, 3, 100), row('b', 2, 1, 900), row('c', 2, 1, 50), row('d', 0)]);
    expect(result.get('a')).toEqual(new Set(['diff']));
    expect(result.get('b')).toEqual(new Set(['diff', 'coins']));
    expect(result.get('c')).toEqual(new Set(['coins']));
    expect(result.has('d')).toBe(false);
  });

  it('si todo es igual decide el nombre', () => {
    expect(tiebreaks([row('a', 1, 0, 10), row('b', 1, 0, 10)]).get('b')).toEqual(new Set(['name']));
  });
});

describe('recentForm', () => {
  const match = (player1: string, player2: string, winnerUsername?: string): MatchDto => ({
    id: `${player1}-${player2}`, player1, player2, winnerUsername,
    status: winnerUsername ? 'COMPLETED' : 'PENDING',
  });
  const schedule = (...rounds: MatchDto[][]): ScheduleResponse => ({
    leagueId: 'l1', stealWindowOpen: false, swapWindowOpen: false,
    // Desordenadas a propósito: cuenta el número de jornada, no la posición
    jornadas: rounds.map((matches, i) => ({ roundNumber: i + 1, matches })).reverse(),
  });

  it('devuelve los resultados del jugador en orden de jornada, ignorando pendientes y ajenos', () => {
    const s = schedule(
      [match('ash', 'brock', 'ash'), match('misty', 'may', 'may')],
      [match('misty', 'ash', 'misty')],
      [match('ash', 'gary')],
    );
    expect(recentForm(s, 'ash')).toEqual(['W', 'L']);
  });

  it('se queda con los últimos n', () => {
    const s = schedule(...['W', 'W', 'L', 'W', 'L', 'L'].map((r) => [match('ash', 'x', r === 'W' ? 'ash' : 'x')]));
    expect(recentForm(s, 'ash', 5)).toEqual(['W', 'L', 'W', 'L', 'L']);
  });

  it('sin calendario no hay racha', () => {
    expect(recentForm(null, 'ash')).toEqual([]);
  });
});
