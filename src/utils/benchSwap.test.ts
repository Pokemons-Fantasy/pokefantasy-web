import { describe, it, expect } from 'vitest';
import type { LeagueSettings } from '../api/leagues';
import type { DraftPick, Tier } from '../api/pokemons';
import { swapQuote, upgradeOffer } from './benchSwap';

const settings = { priceTierS: 500, priceTierA: 300, priceTierB: 150, priceTierC: 50, priceTierD: 0 } as LeagueSettings;

const pick = (pokemonName: string, lockedUntil: string | null = null) =>
  ({ username: 'ash', pokemonName, pokemonId: 1, round: 1, lockedUntil }) as DraftPick;

describe('swapQuote', () => {
  it('bajar de tier da la diferencia', () => {
    expect(swapQuote(settings, 'S', 'B', 100)).toEqual({ net: 350, balanceAfter: 450, affordable: true });
  });

  it('subir de tier cuesta la diferencia y dice si llega el saldo', () => {
    expect(swapQuote(settings, 'D', 'A', 300)).toEqual({ net: -300, balanceAfter: 0, affordable: true });
    expect(swapQuote(settings, 'D', 'A', 299)).toEqual({ net: -300, balanceAfter: -1, affordable: false });
  });

  it('mismo tier o sin precios: no cuesta nada', () => {
    expect(swapQuote(settings, 'B', 'B', 0)).toEqual({ net: 0, balanceAfter: 0, affordable: true });
    expect(swapQuote(undefined, 'D', 'S', 0)).toEqual({ net: 0, balanceAfter: 0, affordable: true });
  });
});

describe('upgradeOffer', () => {
  const tiers = new Map<string, Tier>([['rattata', 'D'], ['pidgey', 'C'], ['onix', 'B'], ['mew', 'S']]);

  it('propone entregar el peor desbloqueado si el de la banca es mejor y llega el saldo', () => {
    expect(upgradeOffer('A', [pick('onix'), pick('rattata'), pick('pidgey')], tiers, settings, 300))
      .toEqual({ give: 'rattata', cost: 300 });
  });

  it('salta los bloqueados', () => {
    const future = new Date(Date.now() + 3_600_000).toISOString();
    expect(upgradeOffer('A', [pick('onix'), pick('rattata', future), pick('pidgey')], tiers, settings, 300))
      .toEqual({ give: 'pidgey', cost: 250 });
  });

  it('nada si no llega el saldo, si no mejora o si no hay equipo', () => {
    expect(upgradeOffer('A', [pick('rattata')], tiers, settings, 299)).toBeNull();
    expect(upgradeOffer('B', [pick('onix'), pick('mew')], tiers, settings, 1000)).toBeNull();
    expect(upgradeOffer('S', [], tiers, settings, 1000)).toBeNull();
  });
});
