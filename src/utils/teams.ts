import type { DraftPick, DraftStatus } from '../api/pokemons';

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
