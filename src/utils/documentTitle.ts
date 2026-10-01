import type { DraftStatus } from '../api/pokemons';

const APP = 'PokeFantasy';

/**
 * Título de la pestaña: "Clasificación · Liga Kanto · PokeFantasy". Con tu turno en el draft empieza por
 * "⏰ Te toca", para verlo con la pestaña en segundo plano.
 */
export function documentTitle({ section, league, myTurn = false }: {
  section?: string | null;
  league?: string | null;
  myTurn?: boolean;
}): string {
  return [myTurn ? '⏰ Te toca' : null, section, league, APP].filter(Boolean).join(' · ');
}

/** Es tu turno en un draft en curso. */
export function isMyDraftTurn(draft: Pick<DraftStatus, 'status' | 'currentTurn'> | null | undefined, username: string | null): boolean {
  return !!username && draft?.status === 'IN_PROGRESS' && draft.currentTurn === username;
}
