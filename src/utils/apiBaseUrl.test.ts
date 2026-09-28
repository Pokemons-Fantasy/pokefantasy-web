import { describe, it, expect } from 'vitest';
import { resolveApiBaseUrl, RENDER_API_URL } from './apiBaseUrl';

describe('resolveApiBaseUrl', () => {
  it('on the web goes through the same-site /api proxy so Safari keeps the session cookie', () => {
    expect(resolveApiBaseUrl(undefined, false)).toBe('/api');
  });

  it('the native app calls Render directly (its origin is https://localhost, the proxy is not there)', () => {
    expect(resolveApiBaseUrl(undefined, true)).toBe(RENDER_API_URL);
  });

  it('VITE_API_URL always wins (local backend)', () => {
    expect(resolveApiBaseUrl('http://localhost:8080', false)).toBe('http://localhost:8080');
    expect(resolveApiBaseUrl('http://localhost:8080', true)).toBe('http://localhost:8080');
  });
});
