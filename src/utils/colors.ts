import type { Tier } from '../api/pokemons';

export const TYPE_COLORS: Record<string, { color: string; bg: string }> = {
  fire:     { color: '#fca5a5', bg: 'rgba(239,68,68,0.15)' },
  water:    { color: '#7dd3fc', bg: 'rgba(56,189,248,0.15)' },
  grass:    { color: '#86efac', bg: 'rgba(74,222,128,0.15)' },
  electric: { color: '#fde047', bg: 'rgba(234,179,8,0.15)' },
  psychic:  { color: '#f0abfc', bg: 'rgba(232,121,249,0.15)' },
  ice:      { color: '#a5f3fc', bg: 'rgba(34,211,238,0.15)' },
  dragon:   { color: '#818cf8', bg: 'rgba(99,102,241,0.15)' },
  dark:     { color: '#a1a1aa', bg: 'rgba(113,113,122,0.15)' },
  fairy:    { color: '#fbcfe8', bg: 'rgba(244,114,182,0.15)' },
  normal:   { color: '#d4d4d8', bg: 'rgba(161,161,170,0.15)' },
  fighting: { color: '#fb923c', bg: 'rgba(249,115,22,0.15)' },
  flying:   { color: '#a5b4fc', bg: 'rgba(129,140,248,0.15)' },
  poison:   { color: '#c084fc', bg: 'rgba(168,85,247,0.15)' },
  ground:   { color: '#d6b986', bg: 'rgba(180,143,74,0.15)' },
  rock:     { color: '#a8a29e', bg: 'rgba(120,113,108,0.15)' },
  bug:      { color: '#a3e635', bg: 'rgba(132,204,22,0.15)' },
  ghost:    { color: '#a78bfa', bg: 'rgba(124,58,237,0.15)' },
  steel:    { color: '#94a3b8', bg: 'rgba(100,116,139,0.15)' },
};

export const TIER_COLORS: Record<Tier, { bg: string; border: string; text: string }> = {
  S: { text: '#fbbf24', bg: 'rgba(251,191,36,0.1)', border: 'rgba(251,191,36,0.3)' },
  A: { text: '#f87171', bg: 'rgba(248,113,113,0.1)', border: 'rgba(248,113,113,0.3)' },
  B: { text: '#60a5fa', bg: 'rgba(96,165,250,0.1)',  border: 'rgba(96,165,250,0.3)' },
  C: { text: '#4ade80', bg: 'rgba(74,222,128,0.1)',  border: 'rgba(74,222,128,0.3)' },
  D: { text: '#a1a1aa', bg: 'rgba(161,161,170,0.1)', border: 'rgba(161,161,170,0.3)' },
};
