import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiClient } from './client';
import { registerPushToken, unregisterPushToken } from './push';

describe('api/push', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('registra el token del dispositivo', async () => {
    const post = vi.spyOn(apiClient, 'post').mockResolvedValue({ data: undefined });
    await registerPushToken('tok-1');
    expect(post).toHaveBeenCalledWith('/v1/users/push-token', { token: 'tok-1' });
  });

  it('da de baja el token con DELETE y el token en el cuerpo', async () => {
    const del = vi.spyOn(apiClient, 'delete').mockResolvedValue({ data: undefined });
    await unregisterPushToken('tok-1');
    expect(del).toHaveBeenCalledWith('/v1/users/push-token', { data: { token: 'tok-1' } });
  });
});
