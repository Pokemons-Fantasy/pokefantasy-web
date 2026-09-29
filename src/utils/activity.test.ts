import { describe, it, expect } from 'vitest';
import type { ActivityEvent } from '../api/activity';
import {
  ACTIVITY_FILTERS,
  describeEvent,
  eventCategory,
  eventPokemon,
  firstSeenEventId,
  groupByDay,
  partsText,
} from './activity';

const ev = (over: Partial<ActivityEvent>): ActivityEvent => ({
  id: 'e1', type: 'STEAL', actorUsername: 'brock', createdAt: '2026-09-28T14:32:00', ...over,
});

describe('describeEvent', () => {
  it('robo: nombres en su parte y Pokémon con mayúscula', () => {
    const parts = describeEvent(ev({ targetUsername: 'misty', pokemonName: 'staryu', coinsAmount: 1 }));
    expect(partsText(parts)).toBe('brock robó a Staryu de misty · 1 moneda');
    expect(parts.filter((p) => p.kind === 'user').map((p) => p.text)).toEqual(['brock', 'misty']);
    expect(parts.find((p) => p.kind === 'pokemon')?.text).toBe('Staryu');
  });

  it('intercambio entre jugadores, con las monedas ofrecidas', () => {
    expect(partsText(describeEvent(ev({
      type: 'TRADE_COMPLETED', actorUsername: 'ash', targetUsername: 'brock',
      pokemonName: 'mewtwo', pokemonName2: 'gengar', coinsAmount: 3,
    })))).toBe('ash cambió Mewtwo a brock por Gengar · con 3 monedas');
  });

  it('intercambio con el banquillo, compra y liberación', () => {
    expect(partsText(describeEvent(ev({ type: 'BENCH_SWAP', actorUsername: 'ash', pokemonName: 'onix', pokemonName2: 'lapras' }))))
      .toBe('ash cambió Onix por Lapras del banquillo');
    expect(partsText(describeEvent(ev({ type: 'BENCH_PURCHASE', actorUsername: 'ash', pokemonName: 'eevee', coinsAmount: 5 }))))
      .toBe('ash compró a Eevee del banquillo · 5 monedas');
    expect(partsText(describeEvent(ev({ type: 'POKEMON_RELEASED', actorUsername: 'ash', pokemonName: 'eevee', coinsAmount: 2 }))))
      .toBe('ash liberó a Eevee al banquillo · +2 monedas');
  });

  it('partidos y resultados anulados', () => {
    expect(partsText(describeEvent(ev({ type: 'MATCH_RESULT', actorUsername: 'ash', targetUsername: 'may', roundNumber: 3 }))))
      .toBe('ash ganó a may · jornada 3');
    expect(partsText(describeEvent(ev({ type: 'MATCH_RESULT_REVERTED', actorUsername: 'ash', targetUsername: 'may', roundNumber: 3 }))))
      .toBe('Se anuló el resultado ash – may · jornada 3');
  });

  it('cambio de tier, con y sin tier anterior', () => {
    expect(partsText(describeEvent(ev({ type: 'TIER_CHANGE', pokemonName: 'pikachu', fromTier: 'C', toTier: 'B' }))))
      .toBe('Pikachu pasó del tier C al B');
    expect(partsText(describeEvent(ev({ type: 'TIER_CHANGE', pokemonName: 'pikachu', toTier: 'B' }))))
      .toBe('Pikachu pasó al tier B');
  });
});

describe('eventCategory / eventPokemon', () => {
  it('agrupa los tipos en las categorías de los filtros', () => {
    expect(eventCategory('STEAL')).toBe('steal');
    expect(eventCategory('BENCH_PURCHASE')).toBe('bench');
    expect(eventCategory('MATCH_RESULT_REVERTED')).toBe('match');
    expect(eventCategory('COIN_EARNED')).toBe('coins');
  });

  it('Pokémon del evento, en orden y sin vacíos', () => {
    expect(eventPokemon(ev({ pokemonName: 'mewtwo', pokemonName2: 'gengar' }))).toEqual(['mewtwo', 'gengar']);
    expect(eventPokemon(ev({ type: 'MATCH_RESULT' }))).toEqual([]);
  });
});

describe('ACTIVITY_FILTERS', () => {
  it('"Todo" no incluye los movimientos de monedas', () => {
    const todo = ACTIVITY_FILTERS.find((f) => f.key === 'all')!;
    expect(todo.types).not.toContain('COIN_EARNED');
    expect(todo.types).not.toContain('COIN_REVOKED');
    expect(todo.types).toContain('STEAL');
  });

  it('cada filtro pide los tipos de su categoría', () => {
    expect(ACTIVITY_FILTERS.find((f) => f.key === 'bench')!.types)
      .toEqual(['BENCH_SWAP', 'BENCH_PURCHASE', 'POKEMON_RELEASED']);
  });
});

describe('groupByDay', () => {
  const now = new Date('2026-09-28T20:00:00');

  it('Hoy, Ayer y la fecha, en el orden de los eventos', () => {
    const groups = groupByDay([
      ev({ id: 'a', createdAt: '2026-09-28T14:00:00' }),
      ev({ id: 'b', createdAt: '2026-09-28T09:00:00' }),
      ev({ id: 'c', createdAt: '2026-09-27T22:00:00' }),
      ev({ id: 'd', createdAt: '2026-05-22T10:00:00' }),
      ev({ id: 'e', createdAt: '2025-12-31T10:00:00' }),
    ], now);
    expect(groups.map((g) => [g.label, g.events.map((e) => e.id)])).toEqual([
      ['Hoy', ['a', 'b']],
      ['Ayer', ['c']],
      ['vie 22 may', ['d']],
      ['mié 31 dic 2025', ['e']],
    ]);
  });
});

describe('firstSeenEventId', () => {
  const events = [
    ev({ id: 'new', createdAt: '2026-09-28T14:00:00' }),
    ev({ id: 'old', createdAt: '2026-09-27T10:00:00' }),
    ev({ id: 'older', createdAt: '2026-09-26T10:00:00' }),
  ];

  it('primer evento que ya habías visto, si hay alguno nuevo antes', () => {
    expect(firstSeenEventId(events, '2026-09-27T10:00:00')).toBe('old');
  });

  it('null en la primera visita, si no hay nada nuevo o si todo es nuevo', () => {
    expect(firstSeenEventId(events, null)).toBeNull();
    expect(firstSeenEventId(events, '2026-09-28T14:00:00')).toBeNull();
    expect(firstSeenEventId(events, '2026-01-01T00:00:00')).toBeNull();
  });
});

describe('DRAFT_COINS', () => {
  it('cuenta lo que sobró del draft y va con las monedas', () => {
    const e = ev({ type: 'DRAFT_COINS', actorUsername: 'ash', coinsAmount: 120 });
    expect(partsText(describeEvent(e))).toBe('ash recibió 120 monedas que le sobraron del draft');
    expect(eventCategory('DRAFT_COINS')).toBe('coins');
  });
});

describe('CLAUSE_RAISED', () => {
  it('cuenta cuánto sube la cláusula (el doble de lo invertido) y va con los robos', () => {
    const e = ev({ type: 'CLAUSE_RAISED', actorUsername: 'ash', pokemonName: 'charizard', coinsAmount: 100 });
    expect(partsText(describeEvent(e))).toBe('ash subió la cláusula de Charizard en 200 · 100 monedas');
    expect(eventCategory('CLAUSE_RAISED')).toBe('steal');
    expect(ACTIVITY_FILTERS.find((f) => f.key === 'steal')?.types).toContain('CLAUSE_RAISED');
  });
});
