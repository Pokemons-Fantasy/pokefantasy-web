import type { JornadaDto, MatchDto } from '../api/leagues';
import { jornadaStates } from './schedule';

/** Jornada que se abre por defecto en el calendario móvil: la que está en juego o, con la temporada terminada, la última. */
export function defaultJornada(jornadas: JornadaDto[]): number | null {
  if (jornadas.length === 0) return null;
  const current = jornadaStates(jornadas).indexOf('current');
  return jornadas[current === -1 ? jornadas.length - 1 : current].roundNumber;
}

/** La jornada pedida en la URL (`?jornada=`) si existe; si no, la de por defecto. */
export function resolveJornada(jornadas: JornadaDto[], requested: string | null): number | null {
  const n = requested !== null && /^\d+$/.test(requested) ? Number(requested) : NaN;
  return jornadas.some((j) => j.roundNumber === n) ? n : defaultJornada(jornadas);
}

/** Tu partido de la jornada aparte, para pintarlo primero; el resto en su orden. */
export function mineFirst(matches: MatchDto[], username: string | null): { mine: MatchDto | null; others: MatchDto[] } {
  const mine = username ? matches.find((m) => m.player1 === username || m.player2 === username) ?? null : null;
  return { mine, others: matches.filter((m) => m !== mine) };
}
