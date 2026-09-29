import { describe, it, expect } from 'vitest';
import { leaguesByUrgency, seasonSummary } from './home';
import type { League, LeagueDraftStatus, MatchDto, ScheduleResponse } from '../api/leagues';

const league = (id: string, draftStatus?: LeagueDraftStatus): League =>
  ({ id, name: id, createdBy: 'ash', memberCount: 2, status: 'SETUP', draftStatus });

describe('leaguesByUrgency', () => {
  it('draft en curso, luego temporada, luego preparación y cancelado, sin mover el resto', () => {
    const sorted = leaguesByUrgency([
      league('prep', 'PENDING'), league('temp1', 'COMPLETED'), league('cancel', 'CANCELLED'),
      league('draft', 'IN_PROGRESS'), league('temp2', 'COMPLETED'), league('nueva'),
    ]);
    expect(sorted.map((l) => l.id)).toEqual(['draft', 'temp1', 'temp2', 'prep', 'cancel', 'nueva']);
  });
});

describe('seasonSummary', () => {
  const played = (player1: string, player2: string, winnerUsername: string, score?: [number, number]): MatchDto => ({
    id: `${player1}-${player2}`, player1, player2, winnerUsername, status: 'COMPLETED',
    winnerScore: score?.[0], loserScore: score?.[1],
  });
  const pending = (player1: string, player2: string): MatchDto =>
    ({ id: `${player1}-${player2}`, player1, player2, status: 'PENDING' });
  const schedule = (...rounds: MatchDto[][]): ScheduleResponse => ({
    leagueId: 'l1', stealWindowOpen: true, swapWindowOpen: false,
    jornadas: rounds.map((matches, i) => ({ roundNumber: i + 1, startDate: `2026-10-0${i + 1}`, matches })),
  });

  it('jornada en juego, tu rival y tu último resultado', () => {
    const s = seasonSummary(schedule(
      [played('ash', 'may', 'ash', [6, 0])],
      [pending('jessie', 'ash'), played('brock', 'misty', 'misty')],
    ), 'ash');
    expect(s.current).toEqual({ roundNumber: 2, startDate: '2026-10-02' });
    expect(s.next).toEqual({ opponent: 'jessie', roundNumber: 2 });
    expect(s.resting).toBe(false);
    expect(s.last).toEqual({ kind: 'won', opponent: 'may', score: '6–0' });
  });

  it('si descansas, el próximo partido es de una jornada posterior', () => {
    const s = seasonSummary(schedule(
      [played('ash', 'may', 'may')],
      [pending('brock', 'misty')],
      [pending('ash', 'brock')],
    ), 'ash');
    expect(s.resting).toBe(true);
    expect(s.next).toEqual({ opponent: 'brock', roundNumber: 3 });
    expect(s.last).toEqual({ kind: 'lost', opponent: 'may', score: null });
  });

  it('temporada terminada', () => {
    const s = seasonSummary(schedule([played('ash', 'may', 'ash')]), 'ash');
    expect(s.current).toBeNull();
    expect(s.next).toBeNull();
  });

  it('sin partidos jugados no hay último resultado', () => {
    expect(seasonSummary(schedule([pending('ash', 'may')]), 'ash').last).toBeNull();
  });
});
