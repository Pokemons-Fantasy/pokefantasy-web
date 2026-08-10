import { describe, it, expect } from 'vitest';
import { tierRank, priceForTier } from './tiers';
import type { LeagueSettings } from '../api/leagues';

describe('tierRank', () => {
  it('ranks S as best (0) through D as worst (4)', () => {
    expect(tierRank('S')).toBe(0);
    expect(tierRank('A')).toBe(1);
    expect(tierRank('B')).toBe(2);
    expect(tierRank('C')).toBe(3);
    expect(tierRank('D')).toBe(4);
  });

  it('treats null/undefined as worst rank (4), same as D', () => {
    expect(tierRank(null)).toBe(4);
    expect(tierRank(undefined)).toBe(4);
  });
});

describe('priceForTier', () => {
  const settings = {
    priceTierS: 500,
    priceTierA: 300,
    priceTierB: 200,
    priceTierC: 100,
    priceTierD: 50,
  } as LeagueSettings;

  it('returns the configured price for each tier', () => {
    expect(priceForTier(settings, 'S')).toBe(500);
    expect(priceForTier(settings, 'A')).toBe(300);
    expect(priceForTier(settings, 'B')).toBe(200);
    expect(priceForTier(settings, 'C')).toBe(100);
    expect(priceForTier(settings, 'D')).toBe(50);
  });

  it('returns 0 when settings is undefined', () => {
    expect(priceForTier(undefined, 'S')).toBe(0);
  });

  it('returns 0 when tier is null/undefined', () => {
    expect(priceForTier(settings, null)).toBe(0);
    expect(priceForTier(settings, undefined)).toBe(0);
  });
});
