import type { Tier } from '../api/pokemons';
import type { LeagueSettings } from '../api/leagues';

/** Tiers de mejor a peor. */
export const TIER_ORDER: Tier[] = ['S', 'A', 'B', 'C', 'D'];

export function tierRank(tier: Tier | null | undefined): number {
  if (!tier) return 4;
  return { S: 0, A: 1, B: 2, C: 3, D: 4 }[tier] ?? 4;
}

export function priceForTier(settings: LeagueSettings | undefined, tier: Tier | null | undefined): number {
  if (!settings || !tier) return 0;
  const map: Record<Tier, number> = {
    S: settings.priceTierS,
    A: settings.priceTierA,
    B: settings.priceTierB,
    C: settings.priceTierC,
    D: settings.priceTierD,
  };
  return map[tier] ?? 0;
}

/** Lo que se recibe al liberar un Pokémon: su precio de mercado entero (ReleasePokemonCommandHandler). */
export function releaseReward(settings: LeagueSettings | undefined, tier: Tier | null | undefined): number {
  return priceForTier(settings, tier);
}
