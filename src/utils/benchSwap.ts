import type { LeagueSettings } from '../api/leagues';
import type { DraftPick, Tier } from '../api/pokemons';
import { isPickLocked } from './teams';
import { priceForTier, tierRank } from './tiers';

export interface SwapQuote {
  /** Positivo: recibes monedas (bajas de tier); negativo: pagas la diferencia (subes). */
  net: number;
  balanceAfter: number;
  affordable: boolean;
}

/** Monedas de un intercambio con la banca: diferencia de precio de mercado entre los dos tiers (SwapWithBenchCommandHandler). */
export function swapQuote(
  settings: LeagueSettings | undefined,
  giveTier: Tier | null | undefined,
  takeTier: Tier | null | undefined,
  balance: number,
): SwapQuote {
  const net = priceForTier(settings, giveTier) - priceForTier(settings, takeTier);
  const balanceAfter = balance + net;
  return { net, balanceAfter, affordable: balanceAfter >= 0 };
}

/**
 * Mejora al alcance con un Pokémon de la banca de tier `takeTier`: entregar el peor Pokémon desbloqueado del
 * equipo, si es de peor tier y el saldo llega para la diferencia. `null` si no hay ninguna.
 */
export function upgradeOffer(
  takeTier: Tier | null | undefined,
  myPicks: DraftPick[],
  tierByName: Map<string, Tier | null | undefined>,
  settings: LeagueSettings | undefined,
  balance: number,
): { give: string; cost: number } | null {
  const worst = myPicks
    .filter((p) => !isPickLocked(p))
    .reduce<DraftPick | null>((acc, p) =>
      !acc || tierRank(tierByName.get(p.pokemonName)) > tierRank(tierByName.get(acc.pokemonName)) ? p : acc, null);
  if (!worst) return null;
  const giveTier = tierByName.get(worst.pokemonName);
  if (tierRank(takeTier) >= tierRank(giveTier)) return null;
  const quote = swapQuote(settings, giveTier, takeTier, balance);
  return quote.affordable ? { give: worst.pokemonName, cost: -quote.net } : null;
}
