import { describe, it, expect } from 'vitest';
import { groupBenchByTier } from './bench';
import type { BenchEntry, Tier } from '../api/pokemons';

const entry = (pokemonName: string, tier: Tier | null): BenchEntry =>
  ({ pokemonName, pokemonId: 1, sprite: '', tier, price: 0 });

describe('groupBenchByTier', () => {
  const tierOf = (e: BenchEntry) => e.tier;

  it('agrupa de S a D, sin tiers vacíos y en orden alfabético dentro de cada uno', () => {
    const groups = groupBenchByTier(
      [entry('pidgey', 'D'), entry('mew', 'S'), entry('lapras', 'A'), entry('abra', 'D'), entry('Eevee', 'D')],
      tierOf,
    );
    expect(groups.map((g) => g.tier)).toEqual(['S', 'A', 'D']);
    expect(groups[2].entries.map((e) => e.pokemonName)).toEqual(['abra', 'Eevee', 'pidgey']);
  });

  it('deja al final los que no tienen tier', () => {
    const groups = groupBenchByTier([entry('ditto', null), entry('mew', 'S')], tierOf);
    expect(groups.map((g) => g.tier)).toEqual(['S', null]);
  });

  it('con un filtro solo deja los tiers elegidos', () => {
    const groups = groupBenchByTier(
      [entry('mew', 'S'), entry('lapras', 'A'), entry('ditto', null)],
      tierOf,
      new Set<Tier>(['A']),
    );
    expect(groups.map((g) => g.tier)).toEqual(['A']);
  });

  it('banca vacía no da grupos', () => {
    expect(groupBenchByTier([], tierOf)).toEqual([]);
  });
});
