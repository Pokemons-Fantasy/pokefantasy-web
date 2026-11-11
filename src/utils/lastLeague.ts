/** Última liga abierta: en móvil la portada lleva directamente a ella. */
const KEY = 'pf-last-league';

export function getLastLeague(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function setLastLeague(leagueId: string): void {
  try {
    localStorage.setItem(KEY, leagueId);
  } catch {
    // Sin almacenamiento (modo privado estricto): la portada irá a Mis ligas.
  }
}
