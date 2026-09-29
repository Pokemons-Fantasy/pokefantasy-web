import { describe, it, expect } from 'vitest';
import { raisedClause, victimCoins } from './clause';
import type { ActivityEvent } from '../api/activity';

describe('raisedClause', () => {
  it('cada moneda invertida suma 2 a la cláusula', () => {
    expect(raisedClause(300, 100)).toBe(500);
    expect(raisedClause(300, 0)).toBe(300);
  });
});

describe('victimCoins', () => {
  const steal = (over: Partial<ActivityEvent>): ActivityEvent => ({
    id: 'e1', type: 'STEAL', actorUsername: 'ash', targetUsername: 'brock', coinsAmount: 300,
    createdAt: '2026-09-29T10:00:00', ...over,
  });

  it('lo que el backend dice que cobró la víctima', () => {
    expect(victimCoins(steal({ targetCoinsAmount: 300 }))).toBe(300);
  });

  it('robos anteriores a la cláusula ×2 (sin targetCoinsAmount): la víctima cobraba el doble', () => {
    expect(victimCoins(steal({}))).toBe(600);
  });
});
