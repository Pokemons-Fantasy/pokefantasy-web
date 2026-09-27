import { describe, it, expect } from 'vitest';
import { jornadaStates, myResult, myResultText, nextMatchFor } from './schedule';
import type { JornadaDto, MatchDto } from '../api/leagues';

const done = (id: string, p1: string, p2: string, winner: string, score?: [number, number]): MatchDto => ({
  id, player1: p1, player2: p2, winnerUsername: winner, status: 'COMPLETED',
  ...(score && { winnerScore: score[0], loserScore: score[1] }),
});
const pending = (id: string, p1: string, p2: string): MatchDto => ({ id, player1: p1, player2: p2, status: 'PENDING' });
const jornada = (roundNumber: number, matches: MatchDto[], startDate?: string): JornadaDto => ({
  roundNumber, matches, startDate,
});

const J1 = jornada(1, [done('a', 'ash', 'may', 'ash', [6, 0]), done('b', 'brock', 'misty', 'misty')], '2026-05-22');
const J2 = jornada(2, [done('c', 'brock', 'ash', 'brock', [3, 1]), pending('d', 'may', 'misty')], '2026-05-29');
const J3 = jornada(3, [pending('e', 'jessie', 'ash'), pending('f', 'may', 'brock')], '2026-06-05');

describe('jornadaStates', () => {
  it('la actual es la primera con partidos pendientes; antes, jugadas; después, próximas', () => {
    expect(jornadaStates([J1, J2, J3])).toEqual(['played', 'current', 'upcoming']);
  });

  it('con la temporada terminada todas están jugadas', () => {
    expect(jornadaStates([J1])).toEqual(['played']);
  });
});

describe('myResult / myResultText', () => {
  it('ganaste, con el marcador desde tu lado', () => {
    expect(myResult(J1, 'ash')).toEqual({ kind: 'won', opponent: 'may', score: '6–0' });
    expect(myResultText(myResult(J1, 'ash'))).toBe('Ganaste a may 6–0');
  });

  it('perdiste, con el marcador desde tu lado', () => {
    expect(myResultText(myResult(J2, 'ash'))).toBe('Perdiste contra brock 1–3');
  });

  it('sin marcador', () => {
    expect(myResultText(myResult(J1, 'misty'))).toBe('Ganaste a brock');
  });

  it('pendiente', () => {
    expect(myResultText(myResult(J3, 'ash'))).toBe('Contra jessie');
  });

  it('descansas si no juegas esa jornada', () => {
    expect(myResultText(myResult(J1, 'jessie'))).toBe('Descansas');
  });

  it('sin usuario no hay resultado propio', () => {
    expect(myResult(J1, null)).toBeNull();
  });
});

describe('nextMatchFor', () => {
  it('primer partido pendiente del usuario, saltando las jornadas que ya jugó', () => {
    expect(nextMatchFor([J1, J2, J3], 'ash')).toEqual({ jornada: J3, opponent: 'jessie' });
  });

  it('puede estar en la jornada actual', () => {
    expect(nextMatchFor([J1, J2, J3], 'misty')).toEqual({ jornada: J2, opponent: 'may' });
  });

  it('null si no le quedan partidos o no hay usuario', () => {
    expect(nextMatchFor([J1, J2], 'ash')).toBeNull();
    expect(nextMatchFor([J1, J2, J3], null)).toBeNull();
  });
});
