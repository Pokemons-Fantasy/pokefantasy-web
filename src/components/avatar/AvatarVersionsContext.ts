import { createContext, useContext } from 'react';

/**
 * Versión de la foto de cada miembro de la liga abierta. La rellena `LeagueLayout` a partir de
 * `league-detail`, así cualquier componente de liga pinta avatares sin pedir nada más.
 */
export const AvatarVersionsContext = createContext<ReadonlyMap<string, number | null>>(new Map());

export function useAvatarVersion(username: string): number | null {
  return useContext(AvatarVersionsContext).get(username) ?? null;
}
