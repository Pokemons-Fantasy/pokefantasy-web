import type { BoardCell, DraftBoardData } from './draftBoard';

/** Una ronda del tablero vista desde un jugador (tablero por jugador en móvil). */
export interface PlayerRound {
  round: number;
  cell: BoardCell;
}

/** Los picks de un jugador ronda a ronda, sacados del tablero completo. */
export function playerColumn(board: DraftBoardData, username: string): PlayerRound[] {
  const col = board.players.indexOf(username);
  if (col === -1) return [];
  return board.rounds.map(({ round, cells }) => ({ round, cell: cells[col] }));
}

/** Orden de las chips de jugadores: tú primero (si juegas) y el resto en el orden de turnos. */
export function playerOrder(players: string[], me: string | null): string[] {
  if (!me || !players.includes(me)) return players;
  return [me, ...players.filter((p) => p !== me)];
}
