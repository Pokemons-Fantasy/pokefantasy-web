import { describe, it, expect } from 'vitest';
import type { ClosedListEntry, DraftConfig, Tier } from '../api/pokemons';
import { arrangeDraftPool, draftFavoritesKey, tierCounts, type DraftPoolFilters } from './draftPool';

const config: DraftConfig = { budget: 100, priceS: 40, priceA: 25, priceB: 15, priceC: 8, priceD: 3, snake: false };
const entry = (pokemonName: string, tier: Tier | null) =>
  ({ id: pokemonName, pokemonId: 1, pokemonName, nominatedBy: 'ash', sprite: '', tier }) as ClosedListEntry;
const pool = [entry('pidgey', 'D'), entry('mewtwo', 'S'), entry('onix', 'B'), entry('abra', 'B'), entry('lapras', 'A')];
const base: DraftPoolFilters = { search: '', tier: 'all', sort: 'tier', onlyAffordable: false };
const names = (list: ClosedListEntry[]) => list.map((e) => e.pokemonName);

describe('tierCounts', () => {
  it('cuántos quedan de cada tier, en orden S → D y sin los vacíos', () => {
    expect(tierCounts(pool)).toEqual([
      { tier: 'S', count: 1 }, { tier: 'A', count: 1 }, { tier: 'B', count: 2 }, { tier: 'D', count: 1 },
    ]);
  });
});

describe('arrangeDraftPool', () => {
  const ctx = { config, remaining: 20, favorites: new Set<string>() };

  it('por tier (S primero) y, dentro del tier, por nombre', () => {
    expect(names(arrangeDraftPool(pool, base, ctx))).toEqual(['mewtwo', 'lapras', 'abra', 'onix', 'pidgey']);
  });

  it('por precio, del más caro al más barato; por nombre, alfabético', () => {
    expect(names(arrangeDraftPool(pool, { ...base, sort: 'price' }, ctx))).toEqual(['mewtwo', 'lapras', 'abra', 'onix', 'pidgey']);
    expect(names(arrangeDraftPool(pool, { ...base, sort: 'name' }, ctx))).toEqual(['abra', 'lapras', 'mewtwo', 'onix', 'pidgey']);
  });

  it('filtra por tier, por nombre y por los que te llegan', () => {
    expect(names(arrangeDraftPool(pool, { ...base, tier: 'B' }, ctx))).toEqual(['abra', 'onix']);
    expect(names(arrangeDraftPool(pool, { ...base, search: 'PID' }, ctx))).toEqual(['pidgey']);
    expect(names(arrangeDraftPool(pool, { ...base, onlyAffordable: true }, ctx))).toEqual(['abra', 'onix', 'pidgey']);
  });

  it('sin presupuesto en el draft, "solo los que me llegan" no quita nada', () => {
    expect(arrangeDraftPool(pool, { ...base, onlyAffordable: true }, { ...ctx, remaining: null })).toHaveLength(5);
  });

  it('los favoritos van arriba, manteniendo el orden elegido entre ellos', () => {
    const favorites = new Set(['pidgey', 'onix']);
    expect(names(arrangeDraftPool(pool, base, { ...ctx, favorites }))).toEqual(['onix', 'pidgey', 'mewtwo', 'lapras', 'abra']);
  });
});

describe('draftFavoritesKey', () => {
  it('es de cada usuario y liga', () => {
    expect(draftFavoritesKey('ash', 'l1')).toBe('pf:draft-favorites:ash:l1');
    expect(draftFavoritesKey('ash', 'l1')).not.toBe(draftFavoritesKey('brock', 'l1'));
  });
});
