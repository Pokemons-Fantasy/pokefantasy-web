import { describe, expect, it } from 'vitest';
import type { MatchDto, ScheduleResponse } from '../api/leagues';
import { teamsSummary } from './teamsSummary';

const played = (player1: string, player2: string, winnerUsername: string): MatchDto =>
  ({ id: `${player1}-${player2}`, player1, player2, winnerUsername, status: 'COMPLETED', winnerScore: 6, loserScore: 0 });
const pending = (player1: string, player2: string): MatchDto =>
  ({ id: `${player1}-${player2}`, player1, player2, status: 'PENDING' });
const schedule = (...rounds: MatchDto[][]): ScheduleResponse => ({
  leagueId: 'l1', stealWindowOpen: false, swapWindowOpen: false,
  jornadas: rounds.map((matches, i) => ({ roundNumber: i + 1, startDate: `2026-10-0${i + 1}`, matches })),
});

const NOW = new Date('2026-11-10T12:00:00Z');

describe('teamsSummary', () => {
  it('sin calendario no hay resumen', () => {
    expect(teamsSummary(undefined, 'ash', NOW)).toBeNull();
  });

  it('con tu partido en la jornada en juego', () => {
    const s = teamsSummary(schedule([played('ash', 'may', 'ash')], [pending('jessie', 'ash')]), 'ash', NOW)!;
    expect(s.roundNumber).toBe(2);
    expect(s.headline).toBe('Tu partido: vs jessie');
    expect(s.opponent).toBe('jessie');
    expect(s.nextLine).toBeNull();
    expect(s.last).toBe('Ganaste a may 6–0');
  });

  it('si descansas, dice contra quién es el siguiente', () => {
    const s = teamsSummary(schedule([pending('brock', 'misty')], [pending('ash', 'misty')]), 'ash', NOW)!;
    expect(s.headline).toBe('Descansas esta jornada');
    expect(s.opponent).toBeNull();
    expect(s.nextLine).toBe('Próximo: misty (jornada 2)');
  });

  it('si ya has jugado la jornada en juego', () => {
    const s = teamsSummary(schedule([played('ash', 'misty', 'misty'), pending('brock', 'may')]), 'ash', NOW)!;
    expect(s.headline).toBe('Ya has jugado esta jornada');
    expect(s.opponent).toBeNull();
  });

  it('con la temporada terminada', () => {
    const s = teamsSummary(schedule([played('ash', 'may', 'ash')]), 'ash', NOW)!;
    expect(s.roundNumber).toBeNull();
    expect(s.headline).toBe('Temporada terminada');
    expect(s.opponent).toBeNull();
    expect(s.steal.text).toBe('cerrados · temporada terminada');
  });

  it('con los robos abiertos dice cuándo cierran', () => {
    const base = schedule([pending('ash', 'may')]);
    const deadline = new Date(NOW.getTime() + 5.5 * 60 * 60 * 1000).toISOString();
    const s = teamsSummary({
      ...base,
      stealWindowOpen: true,
      jornadas: [{ ...base.jornadas[0], stealDeadline: deadline }],
    }, 'ash', NOW)!;
    expect(s.steal).toEqual({ open: true, text: 'abiertos · cierran en 5 h' });
    expect(s.swap.open).toBe(false);
  });
});
