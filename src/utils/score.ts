/**
 * Marcador opcional de un partido (p. ej. 3–1), desde el punto de vista del ganador. Mismas reglas que
 * el backend (MatchScore): los dos o ninguno, entre 0 y 99, y el ganador con más.
 */
export interface MatchScore {
  winnerScore: number;
  loserScore: number;
}

export const SCORE_MAX = 99;

/** Convierte los dos campos del formulario (texto) en marcador, `null` si están vacíos, o un error. */
export function parseScore(winner: string, loser: string): { score: MatchScore | null; error: string | null } {
  const w = winner.trim();
  const l = loser.trim();
  if (!w && !l) return { score: null, error: null };
  if (!w || !l) return { score: null, error: 'Indica el marcador de los dos, o ninguno.' };
  const wn = Number(w);
  const ln = Number(l);
  if (!Number.isInteger(wn) || !Number.isInteger(ln) || wn < 0 || ln < 0 || wn > SCORE_MAX || ln > SCORE_MAX) {
    return { score: null, error: `El marcador debe ser un número entre 0 y ${SCORE_MAX}.` };
  }
  if (wn <= ln) return { score: null, error: 'El ganador debe tener más que el perdedor.' };
  return { score: { winnerScore: wn, loserScore: ln }, error: null };
}

/** Marcador en el orden jugador 1 – jugador 2 (p. ej. "1–3" si ganó el jugador 2), o `null`. */
export function scoreLabel(match: {
  player1: string;
  winnerUsername?: string;
  winnerScore?: number | null;
  loserScore?: number | null;
}): string | null {
  if (match.winnerScore == null || match.loserScore == null || !match.winnerUsername) return null;
  return match.winnerUsername === match.player1
    ? `${match.winnerScore}–${match.loserScore}`
    : `${match.loserScore}–${match.winnerScore}`;
}

/** Diferencia con signo: "+3", "−2", "0". */
export function formatDiff(diff: number): string {
  if (diff > 0) return `+${diff}`;
  if (diff < 0) return `−${Math.abs(diff)}`;
  return '0';
}
