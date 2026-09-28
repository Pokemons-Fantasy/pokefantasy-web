import { describe, it, expect } from 'vitest';
import { isSessionExpired } from './session';

const httpError = (status: number, data?: unknown) => ({ response: { status, data } });

describe('isSessionExpired', () => {
  it('is true only for 401 UNAUTHENTICATED', () => {
    expect(isSessionExpired(httpError(401, { code: 'UNAUTHENTICATED' }))).toBe(true);
  });

  it('a wrong password (401 INVALID_CREDENTIALS) is not an expired session', () => {
    expect(isSessionExpired(httpError(401, { code: 'INVALID_CREDENTIALS' }))).toBe(false);
  });

  it('ignores 403s, network errors and old backends without code', () => {
    expect(isSessionExpired(httpError(403, { code: 'FORBIDDEN' }))).toBe(false);
    expect(isSessionExpired(httpError(403, { error: 'Forbidden' }))).toBe(false);
    expect(isSessionExpired(new Error('Network Error'))).toBe(false);
    expect(isSessionExpired(null)).toBe(false);
  });
});
