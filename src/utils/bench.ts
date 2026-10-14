import type { BenchEntry, Tier } from '../api/pokemons';
import { TIER_ORDER } from './tiers';

export interface BenchTierGroup {
  /** null: Pokémon sin tier asignado, siempre al final. */
  tier: Tier | null;
  entries: BenchEntry[];
}

/**
 * Banquillo en secciones de S a D (y "sin tier" al final), en orden alfabético dentro de cada una.
 * Con `filter` no vacío solo quedan esos tiers. Los grupos vacíos no aparecen.
 */
export function groupBenchByTier(
  bench: BenchEntry[],
  tierOf: (entry: BenchEntry) => Tier | null | undefined,
  filter: Set<Tier> = new Set(),
): BenchTierGroup[] {
  const tiers: (Tier | null)[] = filter.size > 0 ? TIER_ORDER.filter((t) => filter.has(t)) : [...TIER_ORDER, null];
  return tiers
    .map((tier) => ({
      tier,
      entries: bench
        .filter((entry) => (tierOf(entry) ?? null) === tier)
        .sort((a, b) => a.pokemonName.localeCompare(b.pokemonName, 'es', { sensitivity: 'base' })),
    }))
    .filter((group) => group.entries.length > 0);
}
