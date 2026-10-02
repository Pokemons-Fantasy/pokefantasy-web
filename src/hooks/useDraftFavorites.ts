import { useState } from 'react';
import { draftFavoritesKey } from '../utils/draftPool';

function read(key: string): Set<string> {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(key) ?? '[]');
    return new Set(Array.isArray(parsed) ? parsed.filter((n): n is string => typeof n === 'string') : []);
  } catch {
    return new Set();
  }
}

/**
 * Pokémon marcados como favoritos durante el draft (preferencia local de este navegador, por usuario y liga).
 * Los que ya ha elegido alguien dejan de verse solos: el pool del draft solo enseña los disponibles.
 */
export function useDraftFavorites(username: string | null, leagueId: string | undefined) {
  const key = username && leagueId ? draftFavoritesKey(username, leagueId) : null;
  const [state, setState] = useState(() => ({ key, favorites: key ? read(key) : new Set<string>() }));
  // Otro usuario u otra liga en el mismo componente: se relee su lista
  const favorites = state.key === key ? state.favorites : key ? read(key) : new Set<string>();

  const toggle = (pokemonName: string) => {
    const next = new Set(favorites);
    if (next.has(pokemonName)) next.delete(pokemonName);
    else next.add(pokemonName);
    setState({ key, favorites: next });
    if (!key) return;
    try {
      localStorage.setItem(key, JSON.stringify([...next]));
    } catch {
      // Sin almacenamiento (modo privado, bloqueado): se recuerdan solo mientras dure la página
    }
  };

  return { favorites, toggle };
}
