import { describe, it, expect, vi } from 'vitest';
import { apiClient, onSessionExpired } from './client';

const failWith = (status: number, code: string) => {
  const error = Object.assign(new Error(`HTTP ${status}`), { response: { status, data: { code } } });
  return { error, adapter: () => Promise.reject(error) };
};

describe('onSessionExpired', () => {
  it('runs the handler on 401 UNAUTHENTICATED, keeps rejecting, and can be removed', async () => {
    const handler = vi.fn();
    const off = onSessionExpired(handler);
    const { error, adapter } = failWith(401, 'UNAUTHENTICATED');

    await expect(apiClient.get('/v1/leagues/my', { adapter })).rejects.toBe(error);
    expect(handler).toHaveBeenCalledTimes(1);

    off();
    await expect(apiClient.get('/v1/leagues/my', { adapter })).rejects.toBe(error);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('ignores a wrong password', async () => {
    const handler = vi.fn();
    const off = onSessionExpired(handler);
    const { adapter } = failWith(401, 'INVALID_CREDENTIALS');

    await expect(apiClient.post('/v1/user/login', {}, { adapter })).rejects.toBeTruthy();
    expect(handler).not.toHaveBeenCalled();
    off();
  });
});
