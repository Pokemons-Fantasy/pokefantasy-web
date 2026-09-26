import { describe, it, expect } from 'vitest';
import { passwordError, usernameError } from './registration';

describe('registration rules (same as the backend)', () => {
  it('accepts valid usernames and leaves empty input alone', () => {
    expect(usernameError('')).toBeNull();
    expect(usernameError('ash_k')).toBeNull();
    expect(usernameError('Red-2026')).toBeNull();
  });

  it('rejects usernames that are too short, too long or have other characters', () => {
    expect(usernameError('ab')).not.toBeNull();
    expect(usernameError('a'.repeat(21))).not.toBeNull();
    expect(usernameError('ash ketchum')).not.toBeNull();
    expect(usernameError('niño')).not.toBeNull();
  });

  it('password: at least 8 characters and at most 72 bytes', () => {
    expect(passwordError('')).toBeNull();
    expect(passwordError('pikachu')).toMatch(/Mínimo 8/);
    expect(passwordError('pikachu1')).toBeNull();
    expect(passwordError('a'.repeat(72))).toBeNull();
    expect(passwordError('a'.repeat(73))).toMatch(/72 bytes/);
    // 'ñ' ocupa 2 bytes en UTF-8: 37 ñ = 74 bytes aunque sean 37 caracteres.
    expect(passwordError('ñ'.repeat(37))).toMatch(/72 bytes/);
  });
});
