import type { JornadaDto, ScheduleResponse } from '../api/leagues';

export type MarketWindow = 'steal' | 'swap';

export interface WindowStatus {
  open: boolean;
  text: string;
}

const HOUR = 60 * 60 * 1000;

/** Jornada en juego: la primera con algún partido pendiente (la misma que usa el backend). */
function activeJornada(schedule: ScheduleResponse): JornadaDto | undefined {
  return schedule.jornadas.find((j) => j.matches.some((m) => m.status === 'PENDING'));
}

/** "jue 23:59". Las horas del backend son de Madrid, sin zona; se leen como hora local. */
function formatDeadline(deadline: Date): string {
  const day = deadline.toLocaleDateString('es-ES', { weekday: 'short' }).replace('.', '');
  const time = deadline.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  return `${day} ${time}`;
}

function closesText(deadline: Date, now: Date): string {
  const left = deadline.getTime() - now.getTime();
  if (left > 0 && left < HOUR) return `cierran en ${Math.max(1, Math.round(left / 60_000))} min`;
  if (left > 0 && left < 24 * HOUR) return `cierran en ${Math.floor(left / HOUR)} h`;
  return `cierran ${formatDeadline(deadline)}`;
}

/**
 * Texto del estado de una ventana. Si está abierta lo decide el backend (stealWindowOpen /
 * swapWindowOpen, ADR-003); aquí solo se da formato a la hora de cierre que también calcula él.
 */
export function windowStatus(kind: MarketWindow, schedule: ScheduleResponse, now: Date): WindowStatus {
  const open = kind === 'steal' ? schedule.stealWindowOpen : schedule.swapWindowOpen;
  const active = activeJornada(schedule);
  const deadline = kind === 'steal' ? active?.stealDeadline : active?.swapDeadline;

  if (open) {
    return { open, text: deadline ? `abiertos · ${closesText(new Date(deadline), now)}` : 'abiertos' };
  }
  if (!active) return { open, text: 'cerrados · temporada terminada' };
  if (!active.startDate) return { open, text: `cerrados · falta la fecha de la jornada ${active.roundNumber}` };
  // Cada ventana abre cuando se completan todos los partidos de la jornada anterior
  return { open, text: `cerrados · abren al completarse la jornada ${active.roundNumber}` };
}
