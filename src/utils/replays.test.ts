import { describe, expect, it } from 'vitest';
import type { ReplayCandidate } from '../api/leagues';
import { groupBySeries, replayUrl, seriesSummary } from './replays';

function c(id: string, winnerUsername: string, seriesId: string | null = null, gameNumber: number | null = null,
  uploadtime = 1): ReplayCandidate {
  return { id, url: replayUrl(id), uploadtime, winnerUsername, seriesId, gameNumber, selectable: true };
}

describe('replayUrl', () => {
  it('enlaza al replay de Showdown', () => {
    expect(replayUrl('gen9doublescustomgame-1')).toBe('https://replay.pokemonshowdown.com/gen9doublescustomgame-1');
  });
});

describe('groupBySeries', () => {
  it('agrupa por serie manteniendo el orden del backend; las sueltas, cada una en su grupo', () => {
    const groups = groupBySeries([c('b1', 'ash', 's2', 1), c('a1', 'ash', 's1', 1), c('a2', 'misty', 's1', 2),
      c('loose', 'ash')]);

    expect(groups.map((g) => [g.seriesId, g.games.map((x) => x.id)])).toEqual([
      ['s2', ['b1']], ['s1', ['a1', 'a2']], [null, ['loose']],
    ]);
  });
});

describe('seriesSummary', () => {
  it('Bo3: 2-0 y 2-1', () => {
    expect(seriesSummary([c('1', 'ash'), c('2', 'ash')], 3)).toEqual({ winner: 'ash', score: '2-0' });
    expect(seriesSummary([c('1', 'ash'), c('2', 'misty'), c('3', 'ash')], 3)).toEqual({ winner: 'ash', score: '2-1' });
  });

  it('Bo3 incompleta o imposible', () => {
    const error = 'Para una serie al mejor de 3 marca 2 partidas del mismo ganador o 3 con un 2-1.';
    expect(seriesSummary([c('1', 'ash'), c('2', 'misty')], 3)).toEqual({ error });
    expect(seriesSummary([c('1', 'ash')], 3)).toEqual({ error });
    expect(seriesSummary([c('1', 'ash'), c('2', 'ash'), c('3', 'ash')], 3)).toEqual({ error });
  });

  it('Bo1: una partida, sin marcador', () => {
    expect(seriesSummary([c('1', 'misty')], 1)).toEqual({ winner: 'misty', score: null });
    expect(seriesSummary([c('1', 'ash'), c('2', 'ash')], 1)).toEqual({ error: 'Marca una partida.' });
  });

  it('partidas de series distintas o saltándose una, como el backend', () => {
    expect(seriesSummary([c('1', 'ash', 's1', 1), c('2', 'ash', 's2', 1)], 3))
      .toEqual({ error: 'Marca partidas de una misma serie.' });
    expect(seriesSummary([c('1', 'ash', 's1', 1), c('3', 'ash', 's1', 3)], 3))
      .toEqual({ error: 'Marca las partidas seguidas de la serie, empezando por la 1.' });
    expect(seriesSummary([c('1', 'ash', 's1', 1), c('2', 'ash', 's1', 2)], 3)).toEqual({ winner: 'ash', score: '2-0' });
  });

  it('nada marcado', () => {
    expect(seriesSummary([], 3)).toEqual({ error: 'Marca las partidas de la serie.' });
  });
});
