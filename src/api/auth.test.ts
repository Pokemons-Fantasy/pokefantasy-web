import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiClient } from './client';
import { avatarUrl, uploadAvatar } from './auth';

vi.mock('./client', () => ({
  API_BASE_URL: '/api',
  apiClient: { put: vi.fn(), get: vi.fn(), delete: vi.fn(), post: vi.fn() },
}));
const mockedPut = vi.mocked(apiClient.put);

describe('avatar api', () => {
  beforeEach(() => mockedPut.mockReset());

  it('builds a versioned avatar url on the api base', () => {
    expect(avatarUrl('ash', 42)).toBe('/api/v1/users/ash/avatar?v=42');
  });

  it('encodes the username', () => {
    expect(avatarUrl('a b', 1)).toBe('/api/v1/users/a%20b/avatar?v=1');
  });

  it('uploads the image as multipart and returns the new version', async () => {
    mockedPut.mockResolvedValue({ data: { avatarVersion: 7 } });
    const image = new Blob(['jpeg'], { type: 'image/jpeg' });

    await expect(uploadAvatar(image)).resolves.toBe(7);

    const [url, body, config] = mockedPut.mock.calls[0];
    expect(url).toBe('/v1/user/avatar');
    expect(body).toBeInstanceOf(FormData);
    expect((body as FormData).get('file')).toBeInstanceOf(Blob);
    expect(config?.headers).toEqual({ 'Content-Type': 'multipart/form-data' });
  });
});
