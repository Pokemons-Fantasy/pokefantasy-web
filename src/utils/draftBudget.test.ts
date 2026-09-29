import { describe, it, expect } from 'vitest';
import { canAfford, coverageHint, draftPrice, remainingBudget, spendingByPlayer } from './draftBudget';
import type { DraftConfig, DraftPick, DraftStatus } from '../api/pokemons';

const CONFIG: DraftConfig = { budget: 300, priceS: 200, priceA: 150, priceB: 100, priceC: 60, priceD: 30, snake: false };

const pick = (username: string, pokemonName: string, price?: number): DraftPick => ({
  username, pokemonName, pokemonId: 1, round: 1, pickedAt: '2026-09-29T10:00:00Z', price,
});

describe('draftPrice', () => {
  it('precio del tier, 0 sin config o sin tier', () => {
    expect(draftPrice(CONFIG, 'S')).toBe(200);
    expect(draftPrice(CONFIG, 'D')).toBe(30);
    expect(draftPrice(CONFIG, null)).toBe(0);
    expect(draftPrice(undefined, 'S')).toBe(0);
  });
});

describe('remainingBudget', () => {
  const draft: DraftStatus = {
    id: 'd1', status: 'IN_PROGRESS', turnOrder: ['ash'], currentTurn: 'ash', currentRound: 1, picks: [],
    config: CONFIG, budgets: { ash: 120 },
  };
  it('lee budgets del jugador', () => {
    expect(remainingBudget(draft, 'ash')).toBe(120);
  });
  it('null sin presupuesto, sin usuario o si el jugador no está', () => {
    expect(remainingBudget({ ...draft, config: null, budgets: null }, 'ash')).toBeNull();
    expect(remainingBudget(draft, null)).toBeNull();
    expect(remainingBudget(draft, 'misty')).toBeNull();
  });
});

describe('canAfford', () => {
  it('precio igual al saldo se puede pagar; sin presupuesto siempre', () => {
    expect(canAfford(100, 100)).toBe(true);
    expect(canAfford(101, 100)).toBe(false);
    expect(canAfford(500, null)).toBe(true);
  });
});

describe('coverageHint', () => {
  it('informa cuando llega para todas las rondas', () => {
    expect(coverageHint(CONFIG, 10, ['S', 'D'])).toEqual({
      tone: 'info',
      text: 'Con 300 monedas llega para 10 Pokémon del tier más barato (D, 30); hay 10 rondas.',
    });
  });
  it('avisa cuando no llega', () => {
    expect(coverageHint(CONFIG, 12, ['S', 'D'])).toEqual({
      tone: 'warning',
      text: 'Con 300 monedas llega para 10 Pokémon del tier más barato (D, 30) y hay 12 rondas: nadie podrá completar el equipo.',
    });
  });
  it('solo cuenta los tiers que tienen Pokémon; tier gratis o pool vacío', () => {
    expect(coverageHint(CONFIG, 10, ['S'])?.tone).toBe('warning'); // 300 / 200 = 1
    expect(coverageHint({ ...CONFIG, priceD: 0 }, 10, ['D'])).toEqual({
      tone: 'info', text: 'El tier D es gratis: todos podrán completar el equipo.',
    });
    expect(coverageHint(CONFIG, 10, [])).toBeNull();
  });
});

describe('spendingByPlayer', () => {
  it('cuenta tiers y suma lo pagado por jugador', () => {
    const tiers = new Map([['mew', 'S' as const], ['abra', 'D' as const], ['onix', 'D' as const]]);
    const result = spendingByPlayer([pick('ash', 'mew', 200), pick('ash', 'abra', 30), pick('brock', 'onix')], tiers);
    expect(result.get('ash')).toEqual({ counts: { S: 1, A: 0, B: 0, C: 0, D: 1 }, spent: 230 });
    expect(result.get('brock')).toEqual({ counts: { S: 0, A: 0, B: 0, C: 0, D: 1 }, spent: 0 });
  });
});
