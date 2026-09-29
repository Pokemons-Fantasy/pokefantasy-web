import type { LeagueSettings } from '../api/leagues';
import type { Tier } from '../api/pokemons';
import { TIER_ORDER } from './tiers';

export const PRICE_KEY = {
  S: 'priceTierS', A: 'priceTierA', B: 'priceTierB', C: 'priceTierC', D: 'priceTierD',
} as const satisfies Record<Tier, keyof LeagueSettings>;

export const PCT_KEY = {
  S: 'tierPctS', A: 'tierPctA', B: 'tierPctB', C: 'tierPctC', D: 'tierPctD',
} as const satisfies Record<Tier, keyof LeagueSettings>;

export type TierValues = Record<Tier, number>;

export function tierValues(settings: LeagueSettings, keys: Record<Tier, keyof LeagueSettings>): TierValues {
  return Object.fromEntries(TIER_ORDER.map((t) => [t, Number(settings[keys[t]] ?? 0)])) as TierValues;
}

/** Tiers con precio de mercado 0: la cláusula inicial es 0 (robar sale gratis) y comprarlos del banquillo también. */
export function zeroPriceTiers(settings: LeagueSettings): Tier[] {
  return TIER_ORDER.filter((t) => (settings[PRICE_KEY[t]] ?? 0) === 0);
}

/**
 * Corrige la distribución para que sume 100 tocando lo mínimo: si falta, se suma a D; si sobra, se quita
 * empezando por D y subiendo. Devuelve los porcentajes nuevos, o null si ya suma 100.
 */
export function fixTierSum(pcts: TierValues): TierValues | null {
  const sum = TIER_ORDER.reduce((acc, t) => acc + pcts[t], 0);
  if (sum === 100) return null;
  const next = { ...pcts };
  if (sum < 100) {
    next.D += 100 - sum;
    return next;
  }
  let excess = sum - 100;
  for (const tier of [...TIER_ORDER].reverse()) {
    const take = Math.min(next[tier], excess);
    next[tier] -= take;
    excess -= take;
    if (excess === 0) break;
  }
  return next;
}

/**
 * Cuántos Pokémon de un pool de `poolSize` caerían en cada tier. Mismo cálculo que
 * TierAssignmentService.assignTiersToPool del backend: el Pokémon en la posición i (por BST) está en el
 * percentil floor(i * 100 / n) y cae en el primer tier cuyo acumulado lo supera; el resto, en D.
 */
export function tierCountsPreview(poolSize: number, pcts: TierValues): TierValues {
  const counts: TierValues = { S: 0, A: 0, B: 0, C: 0, D: 0 };
  const cumulative: number[] = [];
  TIER_ORDER.slice(0, 4).reduce((acc, t) => {
    cumulative.push(acc + pcts[t]);
    return acc + pcts[t];
  }, 0);
  for (let i = 0; i < poolSize; i++) {
    const pct = Math.floor((i * 100) / poolSize);
    const index = cumulative.findIndex((limit) => pct < limit);
    counts[TIER_ORDER[index === -1 ? 4 : index]]++;
  }
  return counts;
}
