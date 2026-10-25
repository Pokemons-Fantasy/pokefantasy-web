import type { ReplayCandidate } from '../api/leagues';

const REPLAY_BASE_URL = 'https://replay.pokemonshowdown.com/';

export function replayUrl(id: string): string {
  return `${REPLAY_BASE_URL}${id}`;
}

export interface SeriesGroup {
  /** null = partida suelta (sin serie Best Of). */
  seriesId: string | null;
  games: ReplayCandidate[];
}

/** Agrupa los candidatos por serie en el orden en que llegan del backend; cada partida suelta es su propio grupo. */
export function groupBySeries(candidates: ReplayCandidate[]): SeriesGroup[] {
  const groups: SeriesGroup[] = [];
  for (const candidate of candidates) {
    const last = groups.at(-1);
    if (candidate.seriesId && last?.seriesId === candidate.seriesId) last.games.push(candidate);
    else groups.push({ seriesId: candidate.seriesId ?? null, games: [candidate] });
  }
  return groups;
}

export type SeriesSummary = { winner: string; score: string | null } | { error: string };

/**
 * Quién gana la serie con las partidas marcadas, para el resumen en vivo. Mismas reglas y textos que el backend,
 * que es quien valida al importar.
 */
export function seriesSummary(selected: ReplayCandidate[], bestOf: number): SeriesSummary {
  if (selected.length === 0) return { error: 'Marca las partidas de la serie.' };
  const series = new Set(selected.map((g) => g.seriesId ?? ''));
  if (series.size > 1) return { error: 'Marca partidas de una misma serie.' };
  if (!series.has('')) {
    const numbers = selected.map((g) => g.gameNumber ?? 0).sort((a, b) => a - b);
    if (numbers.some((n, i) => n !== i + 1)) {
      return { error: 'Marca las partidas seguidas de la serie, empezando por la 1.' };
    }
  }
  const wins = new Map<string, number>();
  selected.forEach((g) => { if (g.winnerUsername) wins.set(g.winnerUsername, (wins.get(g.winnerUsername) ?? 0) + 1); });
  const [winner, winnerWins] = [...wins.entries()].sort((a, b) => b[1] - a[1])[0] ?? ['', 0];
  if (bestOf === 1) {
    return selected.length === 1 && winner ? { winner, score: null } : { error: 'Marca una partida.' };
  }
  const loserWins = selected.length - winnerWins;
  if (winnerWins === 2 && (loserWins === 0 || loserWins === 1)) return { winner, score: `2-${loserWins}` };
  return { error: 'Para una serie al mejor de 3 marca 2 partidas del mismo ganador o 3 con un 2-1.' };
}
