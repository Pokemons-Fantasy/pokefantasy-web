import type { PlayerStanding, ScheduleResponse } from '../api/leagues';

/** Dato que separa a dos jugadores con las mismas victorias (el orden lo decide el backend). */
export type Tiebreak = 'diff' | 'coins' | 'name';

/**
 * Para cada jugador empatado a victorias con el de arriba o el de abajo, qué dato ha decidido el orden
 * frente a cada vecino. Replica el orden del backend (victorias, diferencia, monedas, nombre) solo para
 * explicarlo: no reordena nada.
 */
export function tiebreaks(rows: PlayerStanding[]): Map<string, Set<Tiebreak>> {
  const result = new Map<string, Set<Tiebreak>>();
  const add = (username: string, reason: Tiebreak) => {
    const set = result.get(username) ?? new Set<Tiebreak>();
    set.add(reason);
    result.set(username, set);
  };
  for (let i = 1; i < rows.length; i++) {
    const above = rows[i - 1];
    const below = rows[i];
    if (above.wins !== below.wins) continue;
    const reason: Tiebreak = above.scoreDiff !== below.scoreDiff ? 'diff'
      : above.coins !== below.coins ? 'coins' : 'name';
    add(above.username, reason);
    add(below.username, reason);
  }
  return result;
}

export type FormResult = 'W' | 'L';

/** Resultados de los últimos `n` partidos jugados por `username`, del más antiguo al más reciente. */
export function recentForm(schedule: ScheduleResponse | null | undefined, username: string, n = 5): FormResult[] {
  if (!schedule) return [];
  const results: FormResult[] = [];
  const jornadas = [...schedule.jornadas].sort((a, b) => a.roundNumber - b.roundNumber);
  for (const jornada of jornadas) {
    for (const match of jornada.matches) {
      if (match.status !== 'COMPLETED' || !match.winnerUsername) continue;
      if (match.player1 !== username && match.player2 !== username) continue;
      results.push(match.winnerUsername === username ? 'W' : 'L');
    }
  }
  return results.slice(-n);
}
