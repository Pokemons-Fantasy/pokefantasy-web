import type { ScheduleResponse } from '../api/leagues';
import { seasonSummary } from './home';
import { windowStatus } from './market';
import type { WindowStatus } from './market';
import { myResultText } from './schedule';

/** Lo que cuenta la card de resumen de Equipos (móvil): la jornada, tu partido y el mercado. */
export interface TeamsSummary {
  /** Jornada en juego; null con la temporada terminada. */
  roundNumber: number | null;
  /** "Tu partido: vs misty", "Descansas esta jornada", "Ya has jugado esta jornada" o "Temporada terminada". */
  headline: string;
  /** Rival del partido de la jornada en juego, para enlazar al calendario. */
  opponent: string | null;
  /** "Próximo: brock (jornada 4)" cuando tu próximo partido no es de la jornada en juego. */
  nextLine: string | null;
  /** Último partido jugado: "Ganaste a may 6–0". */
  last: string | null;
  steal: WindowStatus;
  swap: WindowStatus;
}

export function teamsSummary(schedule: ScheduleResponse | undefined, username: string, now: Date): TeamsSummary | null {
  if (!schedule) return null;
  const { current, next, resting, last } = seasonSummary(schedule, username);
  // Misma regla que la home: el partido es "tuyo" si cae en la jornada en juego
  const nextIsCurrent = !!current && !!next && next.roundNumber === current.roundNumber;

  let headline: string;
  if (!current) headline = 'Temporada terminada';
  else if (nextIsCurrent) headline = `Tu partido: vs ${next!.opponent}`;
  else headline = resting ? 'Descansas esta jornada' : 'Ya has jugado esta jornada';

  return {
    roundNumber: current?.roundNumber ?? null,
    headline,
    opponent: nextIsCurrent ? next!.opponent : null,
    nextLine: current && next && !nextIsCurrent ? `Próximo: ${next.opponent} (jornada ${next.roundNumber})` : null,
    last: last ? myResultText(last) : null,
    steal: windowStatus('steal', schedule, now),
    swap: windowStatus('swap', schedule, now),
  };
}
