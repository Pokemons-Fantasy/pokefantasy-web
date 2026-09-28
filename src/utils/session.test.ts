import { describe, it, expect } from 'vitest';
import { isSessionExpired, loginDestination } from './session';

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

describe('loginDestination', () => {
  const from = { pathname: '/leagues/l1/teams', search: '?x=1' };

  it('sin página de origen, a la home', () => {
    expect(loginDestination(undefined, null, 'ash')).toBe('/');
  });

  it('la misma persona vuelve a donde terminó su sesión (p. ej. caducada)', () => {
    expect(loginDestination(from, { user: 'ash', path: '/leagues/l1/teams?x=1' }, 'ash')).toBe('/leagues/l1/teams?x=1');
  });

  it('otra persona no entra en la página donde terminó la sesión anterior', () => {
    expect(loginDestination(from, { user: 'misty', path: '/leagues/l1/teams?x=1' }, 'ash')).toBe('/');
  });

  it('un enlace abierto después (invitación) se respeta aunque antes hubiera otra sesión', () => {
    expect(loginDestination({ pathname: '/invite/tok', search: '' }, { user: 'misty', path: '/leagues/l1/teams' }, 'ash'))
      .toBe('/invite/tok');
  });
});
