import type { JornadaDto } from '../api/leagues';

export type JornadaState = 'played' | 'current' | 'upcoming';

/** La jornada actual es la primera con algún partido pendiente (la misma regla que el backend). */
export function jornadaStates(jornadas: JornadaDto[]): JornadaState[] {
  const current = jornadas.findIndex((j) => j.matches.some((m) => m.status === 'PENDING'));
  return jornadas.map((_, i) => {
    if (current === -1 || i < current) return 'played';
    return i === current ? 'current' : 'upcoming';
  });
}

export type MyResult =
  | { kind: 'won' | 'lost'; opponent: string; score: string | null }
  | { kind: 'pending'; opponent: string }
  | { kind: 'rest' };

/** Tu partido de la jornada, con el marcador desde tu lado. `null` sin usuario. */
export function myResult(jornada: JornadaDto, username: string | null): MyResult | null {
  if (!username) return null;
  const match = jornada.matches.find((m) => m.player1 === username || m.player2 === username);
  if (!match) return { kind: 'rest' };
  const opponent = match.player1 === username ? match.player2 : match.player1;
  if (match.status !== 'COMPLETED') return { kind: 'pending', opponent };
  const won = match.winnerUsername === username;
  const hasScore = match.winnerScore != null && match.loserScore != null;
  const score = !hasScore ? null
    : won ? `${match.winnerScore}–${match.loserScore}` : `${match.loserScore}–${match.winnerScore}`;
  return { kind: won ? 'won' : 'lost', opponent, score };
}

/** "Ganaste a may 6–0", "Perdiste contra brock", "Contra jessie", "Descansas". */
export function myResultText(result: MyResult | null): string {
  if (!result) return '';
  switch (result.kind) {
    case 'rest': return 'Descansas';
    case 'pending': return `Contra ${result.opponent}`;
    case 'won': return `Ganaste a ${result.opponent}${result.score ? ` ${result.score}` : ''}`;
    case 'lost': return `Perdiste contra ${result.opponent}${result.score ? ` ${result.score}` : ''}`;
  }
}

/** Primer partido pendiente del usuario en el calendario. */
export function nextMatchFor(
  jornadas: JornadaDto[],
  username: string | null,
): { jornada: JornadaDto; opponent: string } | null {
  if (!username) return null;
  for (const jornada of jornadas) {
    const match = jornada.matches.find(
      (m) => m.status === 'PENDING' && (m.player1 === username || m.player2 === username),
    );
    if (match) return { jornada, opponent: match.player1 === username ? match.player2 : match.player1 };
  }
  return null;
}
