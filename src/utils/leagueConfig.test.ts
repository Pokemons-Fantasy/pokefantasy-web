import { describe, it, expect } from 'vitest';
import { fixTierSum, tierCountsPreview, tierValues, zeroPriceTiers, PCT_KEY } from './leagueConfig';
import type { LeagueSettings } from '../api/leagues';

const settings = (patch: Partial<LeagueSettings> = {}): LeagueSettings => ({
  coinsPerWin: 100, coinsPerLoss: 50,
  priceTierS: 50, priceTierA: 40, priceTierB: 30, priceTierC: 20, priceTierD: 10,
  tierPctS: 20, tierPctA: 20, tierPctB: 20, tierPctC: 20, tierPctD: 20,
  ...patch,
});

describe('zeroPriceTiers', () => {
  it('lista los tiers con precio de mercado 0', () => {
    expect(zeroPriceTiers(settings())).toEqual([]);
    expect(zeroPriceTiers(settings({ priceTierA: 0, priceTierD: 0 }))).toEqual(['A', 'D']);
  });
});

describe('fixTierSum', () => {
  it('si ya suma 100 no toca nada', () => {
    expect(fixTierSum({ S: 20, A: 20, B: 20, C: 20, D: 20 })).toBeNull();
  });

  it('si falta, lo suma a D', () => {
    expect(fixTierSum({ S: 10, A: 20, B: 20, C: 20, D: 20 })).toEqual({ S: 10, A: 20, B: 20, C: 20, D: 30 });
  });

  it('si sobra, lo quita empezando por D y subiendo', () => {
    expect(fixTierSum({ S: 40, A: 30, B: 30, C: 10, D: 5 })).toEqual({ S: 40, A: 30, B: 30, C: 0, D: 0 });
  });
});

describe('tierCountsPreview', () => {
  it('reparte como el backend: 20 % cada uno con 10 Pokémon son 2 por tier', () => {
    expect(tierCountsPreview(10, tierValues(settings(), PCT_KEY))).toEqual({ S: 2, A: 2, B: 2, C: 2, D: 2 });
  });

  it('con percentiles que no cuadran, el redondeo sigue el del backend', () => {
    // i*100/7 → 0,14,28,42,57,71,85: S<10 → 1; A<40 → 2 (14,28); B<70 → 2 (42,57); C<90 → 2 (71,85); D → 0
    expect(tierCountsPreview(7, { S: 10, A: 30, B: 30, C: 20, D: 10 })).toEqual({ S: 1, A: 2, B: 2, C: 2, D: 0 });
  });

  it('pool vacío', () => {
    expect(tierCountsPreview(0, tierValues(settings(), PCT_KEY))).toEqual({ S: 0, A: 0, B: 0, C: 0, D: 0 });
  });
});
