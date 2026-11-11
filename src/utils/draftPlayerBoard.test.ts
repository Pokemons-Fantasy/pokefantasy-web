import { describe, expect, it } from 'vitest';
import type { DraftPick } from '../api/pokemons';
import { buildDraftBoard } from './draftBoard';
import { playerColumn, playerOrder } from './draftPlayerBoard';

const pick = (username: string, pokemonName: string, round: number): DraftPick => ({
  username, pokemonName, pokemonId: 1, round, pickedAt: '2026-09-01T10:00:00Z',
});

const BOARD = buildDraftBoard({
  history: [pick('ash', 'mewtwo', 1), pick('misty', 'starmie', 1), pick('ash', 'lapras', 2)],
  turnOrder: ['ash', 'misty'],
  // Mewtwo ya no es de ash: se lo robó misty
  currentPicks: [pick('misty', 'mewtwo', 1), pick('misty', 'starmie', 1), pick('ash', 'lapras', 2)],
  totalRounds: 3,
  current: { round: 2, username: 'misty' },
});

describe('playerColumn', () => {
  it('da una fila por ronda con el pick del jugador, o vacía', () => {
    const ash = playerColumn(BOARD, 'ash');
    expect(ash.map((r) => r.round)).toEqual([1, 2, 3]);
    expect(ash[0].cell.pick?.pokemonName).toBe('mewtwo');
    expect(ash[0].cell.currentOwner).toBe('misty');
    expect(ash[2].cell.pick).toBeNull();
    expect(ash[2].cell.isCurrent).toBe(false);
  });

  it('marca la ronda en la que el jugador está eligiendo', () => {
    expect(playerColumn(BOARD, 'misty')[1].cell.isCurrent).toBe(true);
  });
});

describe('playerOrder', () => {
  it('te pone primero y deja el resto en su orden', () => {
    expect(playerOrder(['brock', 'ash', 'misty'], 'ash')).toEqual(['ash', 'brock', 'misty']);
  });

  it('si no juegas, o sin sesión, deja el orden de turnos', () => {
    expect(playerOrder(['brock', 'ash', 'misty'], 'oak')).toEqual(['brock', 'ash', 'misty']);
    expect(playerOrder(['brock', 'ash', 'misty'], null)).toEqual(['brock', 'ash', 'misty']);
  });
});
