import { describe, it, expect } from 'vitest';
import { inviteUrl, PUBLIC_WEB_URL } from './invite';

describe('inviteUrl', () => {
  it('on the web uses the current origin (production, deploy previews, localhost)', () => {
    expect(inviteUrl('tok', false, 'http://localhost:5173')).toBe('http://localhost:5173/invite/tok');
  });

  it('in the native app points to the public web so the link opens for everyone', () => {
    // En Capacitor el origin es https://localhost: no sirve fuera del móvil que lo genera
    expect(inviteUrl('tok', true, 'https://localhost')).toBe(`${PUBLIC_WEB_URL}/invite/tok`);
    expect(PUBLIC_WEB_URL).toMatch(/^https:\/\//);
  });
});
