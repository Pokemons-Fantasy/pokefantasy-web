/** Misma regla que `LeagueNamePolicy` del backend: 1-40 caracteres tras recortar, sin caracteres de control. */
export const LEAGUE_NAME_MAX = 40;

// eslint-disable-next-line no-control-regex
const CONTROL = /[\u0000-\u001f\u007f-\u009f]/;

export function leagueNameError(name: string): string | null {
  const trimmed = name.trim();
  if (trimmed.length === 0 || trimmed.length > LEAGUE_NAME_MAX) {
    return `El nombre de la liga debe tener entre 1 y ${LEAGUE_NAME_MAX} caracteres.`;
  }
  if (CONTROL.test(trimmed)) {
    return 'El nombre de la liga no puede tener saltos de línea ni caracteres de control.';
  }
  return null;
}
