import type { DraftPick, DraftStatus } from '../api/pokemons';
import { formatDate, formatTime } from './dates';

export interface Team {
  username: string;
  picks: DraftPick[];
}

/**
 * Deriva los equipos a partir de draft.picks, nunca de otra fuente —
 * es la regla de negocio crítica documentada en CLAUDE.md (TeamsPage).
 */
export function deriveTeams(draft: DraftStatus | null | undefined): Team[] {
  if (!draft) return [];
  return draft.turnOrder.map((player) => ({
    username: player,
    picks: (draft.picks ?? [])
      .filter((p) => p.username === player)
      .sort((a, b) => a.pokemonId - b.pokemonId),
  }));
}

/** Un pick robado/tradeado queda bloqueado 7 días — lockedUntil es la fuente de verdad. */
export function isPickLocked(pick: Pick<DraftPick, 'lockedUntil'>): boolean {
  if (!pick.lockedUntil) return false;
  return new Date(pick.lockedUntil) > new Date();
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** Tiempo que le queda a un bloqueo ("2d 5h", "5h", "25 min"), o null si no está bloqueado. */
export function lockRemaining(lockedUntil: string | null | undefined, now: Date): string | null {
  if (!lockedUntil) return null;
  const left = new Date(lockedUntil).getTime() - now.getTime();
  if (left <= 0) return null;
  if (left < HOUR) return `${Math.max(1, Math.floor(left / MINUTE))} min`;
  if (left < DAY) return `${Math.floor(left / HOUR)}h`;
  const days = Math.floor(left / DAY);
  const hours = Math.floor((left % DAY) / HOUR);
  return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
}

/** "Bloqueado hasta sáb 17 oct 21:30", en hora local. */
export function lockedUntilLabel(lockedUntil: string): string {
  const until = new Date(lockedUntil);
  return `Bloqueado hasta ${formatDate(until)} ${formatTime(until)}`;
}
