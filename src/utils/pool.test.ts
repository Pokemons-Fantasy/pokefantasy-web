import { describe, it, expect } from 'vitest';
import { cardLabel, cardState, matchesGen, matchesType, pokemonTypes, nominationsOpen, showsTiers } from './pool';

const p = (id: number, name: string, types?: string[] | null) => ({ id, name, spriteUrl: '', types });

describe('matchesGen', () => {
  it('por rango de número y formas regionales aparte', () => {
    expect(matchesGen(p(25, 'pikachu'), 'gen1')).toBe(true);
    expect(matchesGen(p(152, 'chikorita'), 'gen1')).toBe(false);
    expect(matchesGen(p(10100, 'raichu-alola'), 'gen1')).toBe(false);
    expect(matchesGen(p(10100, 'raichu-alola'), 'regional')).toBe(true);
    expect(matchesGen(p(1, 'bulbasaur'), 'all')).toBe(true);
  });
});

describe('pokemonTypes / matchesType', () => {
  it('usa los tipos de la lista y, si no los trae, los del pool', () => {
    expect(pokemonTypes(p(1, 'bulbasaur', ['grass', 'poison']), undefined)).toEqual(['grass', 'poison']);
    expect(pokemonTypes(p(1, 'bulbasaur', null), { types: ['grass'] })).toEqual(['grass']);
    expect(pokemonTypes(p(1, 'bulbasaur'), undefined)).toEqual([]);
  });

  it('filtra por cualquiera de sus tipos', () => {
    expect(matchesType(['grass', 'poison'], 'poison')).toBe(true);
    expect(matchesType(['grass'], 'water')).toBe(false);
    expect(matchesType([], 'all')).toBe(true);
  });
});

describe('cardState / cardLabel', () => {
  const base = { isNominated: false, isOwn: false, nominationsClosed: false, canNominate: true };

  it('estado según nominaciones y límite', () => {
    expect(cardState(base)).toBe('free');
    expect(cardState({ ...base, isNominated: true, isOwn: true })).toBe('own');
    expect(cardState({ ...base, isNominated: true })).toBe('taken');
    expect(cardState({ ...base, canNominate: false })).toBe('full');
    expect(cardState({ ...base, nominationsClosed: true, canNominate: false })).toBe('closed');
    // Con las nominaciones cerradas lo tuyo ya no se puede quitar
    expect(cardState({ ...base, isNominated: true, isOwn: true, nominationsClosed: true })).toBe('own-closed');
  });

  it('texto accesible con el nombre en mayúscula y quién lo nominó', () => {
    expect(cardLabel('free', 'pikachu')).toBe('Nominar Pikachu');
    expect(cardLabel('own', 'pikachu')).toBe('Quitar Pikachu de tus nominaciones');
    expect(cardLabel('taken', 'pikachu', 'misty')).toBe('Pikachu, nominado por misty');
    expect(cardLabel('full', 'pikachu')).toBe('Pikachu, ya tienes el máximo de nominaciones');
    expect(cardLabel('closed', 'pikachu')).toBe('Pikachu, nominaciones cerradas');
    expect(cardLabel('own-closed', 'pikachu')).toBe('Pikachu, nominado por ti');
  });
});

describe('nominationsOpen', () => {
  it('abiertas sin draft o con el draft cancelado, cerradas en el resto', () => {
    expect(nominationsOpen(null)).toBe(true);
    expect(nominationsOpen('CANCELLED')).toBe(true);
    expect(nominationsOpen('PENDING')).toBe(false);
    expect(nominationsOpen('IN_PROGRESS')).toBe(false);
    expect(nominationsOpen('COMPLETED')).toBe(false);
  });
});

describe('showsTiers', () => {
  it('solo desde que se prepara el draft', () => {
    expect(showsTiers(null)).toBe(false);
    expect(showsTiers('CANCELLED')).toBe(false);
    expect(showsTiers('PENDING')).toBe(true);
    expect(showsTiers('IN_PROGRESS')).toBe(true);
    expect(showsTiers('COMPLETED')).toBe(true);
  });
});
