import { describe, it, expect } from 'vitest';
import { buildDraftBoard } from './draftBoard';
import type { DraftPick } from '../api/pokemons';

const pick = (username: string, pokemonName: string, round: number): DraftPick => ({
  username, pokemonName, pokemonId: 1, round, pickedAt: '2026-09-01T10:00:00Z',
});

const ORDER = ['ash', 'brock', 'misty'];

describe('buildDraftBoard', () => {
  it('coloca cada pick en su ronda y en la columna de su jugador, con el número global', () => {
    const history = [
      pick('ash', 'mewtwo', 1), pick('brock', 'onix', 1), pick('misty', 'starmie', 1),
      pick('ash', 'pikachu', 2),
    ];
    const board = buildDraftBoard({ history, turnOrder: ORDER });

    expect(board.players).toEqual(ORDER);
    expect(board.rounds.map((r) => r.round)).toEqual([1, 2]);
    expect(board.rounds[0].cells.map((c) => c.pick?.pokemonName)).toEqual(['mewtwo', 'onix', 'starmie']);
    expect(board.rounds[1].cells.map((c) => c.pick?.pokemonName ?? null)).toEqual(['pikachu', null, null]);
    expect(board.rounds[1].cells.map((c) => c.pickNumber)).toEqual([4, 5, 6]);
  });

  it('con el total de rondas pinta también las rondas aún vacías', () => {
    const board = buildDraftBoard({ history: [pick('ash', 'mewtwo', 1)], turnOrder: ORDER, totalRounds: 3 });
    expect(board.rounds.map((r) => r.round)).toEqual([1, 2, 3]);
    expect(board.rounds[2].cells.every((c) => c.pick === null)).toBe(true);
  });

  it('en snake las rondas pares se numeran de derecha a izquierda', () => {
    const board = buildDraftBoard({ history: [], turnOrder: ORDER, totalRounds: 2, snake: true });
    expect(board.rounds[0].cells.map((c) => c.pickNumber)).toEqual([1, 2, 3]);
    expect(board.rounds[1].cells.map((c) => c.pickNumber)).toEqual([6, 5, 4]);
  });

  it('marca la casilla del turno actual', () => {
    const board = buildDraftBoard({
      history: [pick('ash', 'mewtwo', 1)],
      turnOrder: ORDER,
      current: { round: 1, username: 'brock' },
    });
    expect(board.rounds[0].cells.map((c) => c.isCurrent)).toEqual([false, true, false]);
  });

  it('indica el dueño actual cuando el Pokémon cambió de manos', () => {
    const history = [pick('ash', 'mewtwo', 1), pick('brock', 'onix', 1)];
    const currentPicks = [pick('misty', 'mewtwo', 1), pick('brock', 'onix', 1)];
    const board = buildDraftBoard({ history, turnOrder: ORDER, currentPicks });

    expect(board.rounds[0].cells[0].currentOwner).toBe('misty');
    expect(board.rounds[0].cells[1].currentOwner).toBeNull();
  });

  it('ignora picks de jugadores que ya no están en la liga', () => {
    const history = [pick('ash', 'mewtwo', 1), pick('gary', 'eevee', 1)];
    const board = buildDraftBoard({ history, turnOrder: ORDER });
    expect(board.rounds[0].cells.map((c) => c.pick?.pokemonName ?? null)).toEqual(['mewtwo', null, null]);
  });

  it('sin historial ni rondas previstas no hay filas', () => {
    expect(buildDraftBoard({ history: [], turnOrder: ORDER }).rounds).toEqual([]);
  });
});
