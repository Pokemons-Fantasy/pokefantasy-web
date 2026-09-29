import type { League, ScheduleResponse } from '../api/leagues';
import { leaguePhase, type LeaguePhase } from './leaguePhase';
import { jornadaStates, myResult, nextMatchFor, type MyResult } from './schedule';

const URGENCY: Record<LeaguePhase, number> = { draft: 0, season: 1, preparing: 2, setup: 2, cancelled: 2 };

/** Ligas de la home por urgencia: draft en curso, temporada y preparación (estable dentro de cada fase). */
export function leaguesByUrgency(leagues: League[]): League[] {
  return leagues
    .map((league, i) => ({ league, i }))
    .sort((a, b) => URGENCY[leaguePhase(a.league.draftStatus)] - URGENCY[leaguePhase(b.league.draftStatus)] || a.i - b.i)
    .map(({ league }) => league);
}

export interface SeasonSummary {
  /** Jornada en juego; null si ya se jugaron todas. */
  current: { roundNumber: number; startDate?: string } | null;
  /** Tu partido pendiente más cercano (puede ser de una jornada posterior si descansas o ya jugaste). */
  next: { opponent: string; roundNumber: number } | null;
  /** Descansas en la jornada en juego. */
  resting: boolean;
  /** Tu último partido jugado. */
  last: Extract<MyResult, { kind: 'won' | 'lost' }> | null;
}

/** Lo que la home cuenta de una liga en temporada, a partir de su calendario. */
export function seasonSummary(schedule: ScheduleResponse, username: string): SeasonSummary {
  const jornadas = [...schedule.jornadas].sort((a, b) => a.roundNumber - b.roundNumber);
  const states = jornadaStates(jornadas);
  const currentIndex = states.indexOf('current');
  const current = currentIndex === -1 ? null : jornadas[currentIndex];

  const next = nextMatchFor(jornadas, username);

  let last: SeasonSummary['last'] = null;
  for (let i = jornadas.length - 1; i >= 0 && !last; i--) {
    const result = myResult(jornadas[i], username);
    if (result && (result.kind === 'won' || result.kind === 'lost')) last = result;
  }

  return {
    current: current ? { roundNumber: current.roundNumber, startDate: current.startDate } : null,
    next: next ? { opponent: next.opponent, roundNumber: next.jornada.roundNumber } : null,
    resting: !!current && myResult(current, username)?.kind === 'rest',
    last,
  };
}
