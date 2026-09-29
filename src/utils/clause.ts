import type { ActivityEvent } from '../api/activity';

/** Cada moneda invertida en subir la cláusula de robo suma esto (la regla la aplica el backend). */
export const CLAUSE_RAISE_MULTIPLIER = 2;

export function raisedClause(current: number, investment: number): number {
  return current + investment * CLAUSE_RAISE_MULTIPLIER;
}

/**
 * Monedas que cobró la víctima de un robo. Los robos anteriores a la cláusula ×2 no traen
 * `targetCoinsAmount`: entonces la víctima cobraba el doble de lo que pagó el ladrón.
 */
export function victimCoins(steal: ActivityEvent): number {
  return steal.targetCoinsAmount ?? 2 * (steal.coinsAmount ?? 0);
}
