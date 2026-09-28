import { describe, it, expect } from 'vitest';
import { moveTurn, shuffleTurnOrder, syncTurnOrder } from './turnOrder';

describe('syncTurnOrder', () => {
  it('sin orden colocado usa el de la liga', () => {
    expect(syncTurnOrder([], ['ash', 'misty', 'brock'])).toEqual(['ash', 'misty', 'brock']);
  });

  it('conserva el orden colocado y añade al final a quien entra después', () => {
    expect(syncTurnOrder(['brock', 'ash'], ['ash', 'brock', 'misty'])).toEqual(['brock', 'ash', 'misty']);
  });

  it('quita a quien ya no es miembro', () => {
    expect(syncTurnOrder(['brock', 'gary', 'ash'], ['ash', 'brock'])).toEqual(['brock', 'ash']);
  });
});

describe('moveTurn', () => {
  it('sube y baja una posición', () => {
    expect(moveTurn(['a', 'b', 'c'], 1, -1)).toEqual(['b', 'a', 'c']);
    expect(moveTurn(['a', 'b', 'c'], 1, 1)).toEqual(['a', 'c', 'b']);
  });

  it('en los extremos no cambia nada', () => {
    const order = ['a', 'b'];
    expect(moveTurn(order, 0, -1)).toBe(order);
    expect(moveTurn(order, 1, 1)).toBe(order);
  });
});

describe('shuffleTurnOrder', () => {
  it('reordena sin perder ni repetir a nadie y no toca el original', () => {
    const order = ['a', 'b', 'c', 'd'];
    const shuffled = shuffleTurnOrder(order, () => 0);
    expect(shuffled).toEqual(['b', 'c', 'd', 'a']);
    expect([...shuffled].sort()).toEqual(order);
    expect(order).toEqual(['a', 'b', 'c', 'd']);
  });
});
