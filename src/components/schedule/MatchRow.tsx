import type { MatchDto } from '../../api/leagues';
import { scoreLabel } from '../../utils/score';
import { lineupState } from '../../utils/lineup';
import { formatDay } from '../../utils/dates';
import UserAvatar from '../avatar/UserAvatar';
import MatchLineups from './MatchLineups';
import { replayUrl } from '../../utils/replays';

interface MatchRowProps {
  match: MatchDto;
  username: string | null;
  isAdmin: boolean;
  /** Desde cuándo se puede declarar la alineación en esta jornada (del backend). */
  lineupOpensAt?: string | null;
  spriteIds: Map<string, number>;
  onRecord: () => void;
  onEdit: () => void;
  /** Abrir "Jugar en Showdown" (solo en mis partidos pendientes). */
  onPlay: () => void;
  onLineup: () => void;
  /** Abrir "Importar de Showdown" (jugadores del partido o admin, partido pendiente). */
  onImport: () => void;
}

/** "vie 5 jun, 16:00" de una fecha-hora local del backend ("YYYY-MM-DDTHH:mm[:ss]"). */
function formatDayTime(iso: string): string {
  return `${formatDay(iso)}, ${iso.slice(11, 16)}`;
}

export default function MatchRow({
  match, username, isAdmin, lineupOpensAt, spriteIds, onRecord, onEdit, onPlay, onLineup, onImport,
}: MatchRowProps) {
  const completed = match.status === 'COMPLETED';
  const mine = !!username && (match.player1 === username || match.player2 === username);
  const rival = match.player1 === username ? match.player2 : match.player1;
  const lineup = lineupState(match, username);
  // El backend decide (hora de Madrid, solo la jornada activa); aquí solo se pinta la fecha.
  const opensLater = !!match.lineupPending && !!lineupOpensAt;

  function playerClass(player: string, side: 'left' | 'right') {
    const result = !completed ? '' : match.winnerUsername === player ? ' winner' : ' loser';
    return `match-player ${side}${result}${player === username ? ' me' : ''}`;
  }

  function playerName(player: string) {
    return (
      <>
        {completed && match.winnerUsername === player && '✓ '}
        <UserAvatar username={player} size={20} className="avatar-inline" />
        {player}
      </>
    );
  }

  let status: string | null = null;
  if (mine && !completed && lineup === 'waiting-rival') status = `Esperando la alineación de ${rival}`;
  else if (mine && !completed && lineup === 'waiting-me') status = `${rival} ya ha enviado su alineación`;
  else if (opensLater) status = `Podrás declarar tu alineación desde ${formatDayTime(lineupOpensAt!)}`;

  return (
    <div className={`match-row${mine ? ' mine' : ''}`} data-testid={`match-${match.id}`}>
      <div className="match-main">
        <span className={playerClass(match.player1, 'left')}>{playerName(match.player1)}</span>
        <span className={`match-badge${completed ? ' done' : ''}`}>
          {completed ? scoreLabel(match) ?? 'FIN' : 'vs'}
        </span>
        <span className={playerClass(match.player2, 'right')}>{playerName(match.player2)}</span>

        <div className="match-actions">
          {mine && !completed && (
            <button type="button" className="match-action" onClick={onPlay}>
              <span aria-hidden="true">⚔</span> Jugar en Showdown
            </button>
          )}
          {match.lineupOpen && (
            <button type="button" className="match-action" onClick={onLineup}>
              {lineup === 'waiting-rival' ? 'Cambiar alineación' : 'Declarar alineación'}
            </button>
          )}
          {(mine || isAdmin) && !completed && (
            <button type="button" className="match-action" onClick={onImport}>Importar de Showdown</button>
          )}
          {isAdmin && !completed && (
            <button type="button" className="match-action" onClick={onRecord}>▶ Resultado</button>
          )}
          {isAdmin && completed && (
            <button
              type="button"
              className="match-action"
              onClick={onEdit}
              aria-label={`Corregir resultado ${match.player1} vs ${match.player2}`}
            >
              ✎ Corregir
            </button>
          )}
        </div>
      </div>
      <MatchLineups match={match} username={username} spriteIds={spriteIds} status={status} />
      {!!match.replayIds?.length && (
        <div className="match-replays">
          <span>Replays:</span>
          {match.replayIds.map((id, i) => (
            <a key={id} href={replayUrl(id)} target="_blank" rel="noopener noreferrer">Partida {i + 1}</a>
          ))}
          {!!match.importWarnings?.length && (
            <ul className="match-lineup-warnings">
              {match.importWarnings.map((w) => <li key={w}>{w}</li>)}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
