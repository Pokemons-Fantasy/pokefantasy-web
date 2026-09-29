import type { DraftConfig, DraftPick, DraftStatus, Tier } from '../api/pokemons';
import { TIER_ORDER } from './tiers';

type PriceKey = 'priceS' | 'priceA' | 'priceB' | 'priceC' | 'priceD';
const PRICE_KEY: Record<Tier, PriceKey> = { S: 'priceS', A: 'priceA', B: 'priceB', C: 'priceC', D: 'priceD' };

/** Precio de un tier en el draft; 0 si el draft no tiene presupuesto o el Pokémon no tiene tier. */
export function draftPrice(config: DraftConfig | null | undefined, tier: Tier | null | undefined): number {
  if (!config || !tier) return 0;
  return config[PRICE_KEY[tier]];
}

/** Monedas que le quedan a `username` según el backend; null si el draft no tiene presupuesto. */
export function remainingBudget(draft: DraftStatus | null | undefined, username: string | null): number | null {
  if (!draft?.config || !draft.budgets || !username) return null;
  return draft.budgets[username] ?? null;
}

/** Misma regla que el backend: se puede pagar si el precio no supera lo que queda. */
export function canAfford(price: number, remaining: number | null): boolean {
  return remaining === null || price <= remaining;
}

export interface CoverageHint {
  tone: 'info' | 'warning';
  text: string;
}

/** Aviso orientativo de la preparación: cuántos Pokémon del tier más barato cubre el presupuesto frente a las rondas. */
export function coverageHint(config: DraftConfig, rounds: number, tiersInPool: Tier[]): CoverageHint | null {
  const present = TIER_ORDER.filter((t) => tiersInPool.includes(t));
  if (present.length === 0) return null;
  const cheapestTier = present.reduce((best, t) => (draftPrice(config, t) < draftPrice(config, best) ? t : best));
  const cheapest = draftPrice(config, cheapestTier);
  if (cheapest === 0) {
    return { tone: 'info', text: `El tier ${cheapestTier} es gratis: todos podrán completar el equipo.` };
  }
  const picks = Math.floor(config.budget / cheapest);
  const base = `Con ${config.budget} monedas llega para ${picks} Pokémon del tier más barato (${cheapestTier}, ${cheapest})`;
  return picks >= rounds
    ? { tone: 'info', text: `${base}; hay ${rounds} rondas.` }
    : { tone: 'warning', text: `${base} y hay ${rounds} rondas: nadie podrá completar el equipo.` };
}

export interface SpendingSummary {
  counts: Record<Tier, number>;
  spent: number;
}

/** Reparto por tier y monedas gastadas de cada jugador, a partir de draftHistory. */
export function spendingByPlayer(
  history: DraftPick[], tierByName: Map<string, Tier | null | undefined>,
): Map<string, SpendingSummary> {
  const result = new Map<string, SpendingSummary>();
  for (const p of history) {
    const summary = result.get(p.username) ?? { counts: { S: 0, A: 0, B: 0, C: 0, D: 0 }, spent: 0 };
    const tier = tierByName.get(p.pokemonName);
    if (tier) summary.counts[tier] += 1;
    summary.spent += p.price ?? 0;
    result.set(p.username, summary);
  }
  return result;
}
