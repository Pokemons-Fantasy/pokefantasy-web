import type { ClosedListEntry, DraftConfig, Tier } from '../api/pokemons';
import { canAfford, draftPrice } from './draftBudget';
import { TIER_ORDER, tierRank } from './tiers';

export type DraftPoolSort = 'tier' | 'price' | 'name';

/** Lo que el jugador elige para ver el pool del draft. */
export interface DraftPoolFilters {
  search: string;
  tier: Tier | 'all';
  sort: DraftPoolSort;
  /** Solo los que puede pagar con lo que le queda. */
  onlyAffordable: boolean;
}

/** Cuántos Pokémon quedan de cada tier, de S a D, sin los tiers vacíos. */
export function tierCounts(entries: ClosedListEntry[]): { tier: Tier; count: number }[] {
  return TIER_ORDER
    .map((tier) => ({ tier, count: entries.filter((e) => e.tier === tier).length }))
    .filter((t) => t.count > 0);
}

/**
 * Pool del draft filtrado y ordenado. Los favoritos van primero, conservando entre ellos el orden elegido.
 * Por tier: S primero; por precio: del más caro al más barato; empates, por nombre.
 */
export function arrangeDraftPool(
  entries: ClosedListEntry[],
  filters: DraftPoolFilters,
  { config, remaining, favorites }: { config: DraftConfig | null; remaining: number | null; favorites: Set<string> },
): ClosedListEntry[] {
  const query = filters.search.trim().toLowerCase();
  const price = (e: ClosedListEntry) => draftPrice(config, e.tier);
  const byName = (a: ClosedListEntry, b: ClosedListEntry) => a.pokemonName.localeCompare(b.pokemonName);
  const compare: Record<DraftPoolSort, (a: ClosedListEntry, b: ClosedListEntry) => number> = {
    tier: (a, b) => tierRank(a.tier) - tierRank(b.tier) || byName(a, b),
    price: (a, b) => price(b) - price(a) || byName(a, b),
    name: byName,
  };
  const favoriteFirst = (a: ClosedListEntry, b: ClosedListEntry) =>
    Number(favorites.has(b.pokemonName)) - Number(favorites.has(a.pokemonName));
  return entries
    .filter((e) => e.pokemonName.toLowerCase().includes(query))
    .filter((e) => filters.tier === 'all' || e.tier === filters.tier)
    .filter((e) => !filters.onlyAffordable || canAfford(price(e), remaining))
    .sort((a, b) => favoriteFirst(a, b) || compare[filters.sort](a, b));
}

/** Favoritos del draft guardados en este navegador, por usuario y liga. */
export const draftFavoritesKey = (username: string, leagueId: string) => `pf:draft-favorites:${username}:${leagueId}`;
