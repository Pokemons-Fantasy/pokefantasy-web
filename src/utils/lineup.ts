import type { Lineup, MatchDto } from '../api/leagues';

/** Pokémon por alineación: 6, o el equipo entero si tiene menos (la misma regla que valida el backend). */
export function lineupSize(teamSize: number): number {
  return Math.min(6, teamSize);
}

export function myLineup(match: MatchDto, username: string | null): Lineup | null {
  if (username === match.player1) return match.player1Lineup ?? null;
  if (username === match.player2) return match.player2Lineup ?? null;
  return null;
}

export function rivalLineup(match: MatchDto, username: string | null): Lineup | null {
  if (username === match.player1) return match.player2Lineup ?? null;
  if (username === match.player2) return match.player1Lineup ?? null;
  return null;
}

export type LineupState = 'none' | 'waiting-rival' | 'waiting-me' | 'revealed';

/**
 * En qué punto está la alineación del partido para `username`. Quien no juega solo distingue entre
 * revelada y el resto.
 */
export function lineupState(match: MatchDto, username: string | null): LineupState {
  const p1 = !!match.player1LineupSubmitted;
  const p2 = !!match.player2LineupSubmitted;
  if (p1 && p2) return 'revealed';
  const mineIs1 = username === match.player1;
  if (!mineIs1 && username !== match.player2) return 'none';
  const mine = mineIs1 ? p1 : p2;
  const rival = mineIs1 ? p2 : p1;
  if (mine) return 'waiting-rival';
  if (rival) return 'waiting-me';
  return 'none';
}
