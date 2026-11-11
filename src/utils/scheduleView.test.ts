import { describe, expect, it } from 'vitest';
import type { JornadaDto, MatchDto } from '../api/leagues';
import { defaultJornada, mineFirst, resolveJornada } from './scheduleView';

const played = (player1: string, player2: string, winnerUsername: string): MatchDto =>
  ({ id: `${player1}-${player2}`, player1, player2, winnerUsername, status: 'COMPLETED', winnerScore: 6, loserScore: 0 });
const pending = (player1: string, player2: string): MatchDto =>
  ({ id: `${player1}-${player2}`, player1, player2, status: 'PENDING' });
const jornadas = (...rounds: MatchDto[][]): JornadaDto[] =>
  rounds.map((matches, i) => ({ roundNumber: i + 1, startDate: `2026-10-0${i + 1}`, matches }));

const EN_CURSO = jornadas([played('ash', 'may', 'ash')], [pending('brock', 'ash')]);
const TERMINADA = jornadas([played('ash', 'may', 'ash')], [played('brock', 'ash', 'ash')], [played('ash', 'gary', 'gary')]);

describe('defaultJornada', () => {
  it('es la jornada en juego', () => {
    expect(defaultJornada(EN_CURSO)).toBe(2);
  });

  it('con la temporada terminada, la última', () => {
    expect(defaultJornada(TERMINADA)).toBe(3);
  });

  it('sin jornadas no hay', () => {
    expect(defaultJornada([])).toBeNull();
  });
});

describe('resolveJornada', () => {
  it('usa la pedida si existe', () => {
    expect(resolveJornada(EN_CURSO, '1')).toBe(1);
  });

  it.each(['99', 'abc', null])('con %s usa la de por defecto', (requested) => {
    expect(resolveJornada(EN_CURSO, requested)).toBe(2);
  });
});

describe('mineFirst', () => {
  const matches = [pending('misty', 'gary'), pending('brock', 'ash'), pending('may', 'dawn')];

  it('separa tu partido y deja el resto en su orden', () => {
    expect(mineFirst(matches, 'ash')).toEqual({ mine: matches[1], others: [matches[0], matches[2]] });
  });

  it('sin partido tuyo, todos van en el resto', () => {
    expect(mineFirst(matches, 'jessie')).toEqual({ mine: null, others: matches });
    expect(mineFirst(matches, null)).toEqual({ mine: null, others: matches });
  });
});
