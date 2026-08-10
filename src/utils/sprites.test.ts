import { describe, it, expect } from 'vitest';
import { spriteUrl } from './sprites';

describe('spriteUrl', () => {
  it('builds a direct CDN URL from the PokeAPI sprites repo, never proxied by the backend', () => {
    expect(spriteUrl(25)).toBe(
      'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png'
    );
  });

  it('works for any positive pokemon id', () => {
    expect(spriteUrl(1)).toBe('https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/1.png');
    expect(spriteUrl(1025)).toBe('https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/1025.png');
  });
});
