import type { MatchDto } from '../../api/leagues';
import { scoreLabel } from '../../utils/score';
import { lineupState } from '../../utils/lineup';
import { formatDay } from '../../utils/dates';
import UserAvatar from '../avatar/UserAvatar';
import MatchLineups from './MatchLineups';

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
}

/** "vie 5 jun, 16:00" de una fecha-hora local del backend ("YYYY-MM-DDTHH:mm[:ss]"). */
function formatDayTime(iso: string): string {
  return `${formatDay(iso)}, ${iso.slice(11, 16)}`;
}

export default function MatchRow({
  match, username, isAdmin, lineupOpensAt, spriteIds, onRecord, onEdit, onPlay, onLineup,
}: MatchRowProps) {
  const completed = match.status === 'COMPLETED';
  const mine = !!username && (match.player1 === username || match.player2 === username);
  const rival = match.player1 === username ? match.player2 : match.player1;
  const lineup = lineupState(match, username);
  // Solo informativo: si se puede declarar lo dice el backend con lineupOpen.
  const opensLater = mine && !completed && !match.lineupOpen && lineup !== 'revealed' && !!lineupOpensAt
    && new Date(lineupOpensAt) > new Date();

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

  return (
    <div className={`match-row${mine ? ' mine' : ''}`} data-testid={`match-${match.id}`}>
      <span className={playerClass(match.player1, 'left')}>{playerName(match.player1)}</span>
      <span className={`match-badge${completed ? ' done' : ''}`}>
        {completed ? scoreLabel(match) ?? 'FIN' : 'vs'}
      </span>
      <span className={playerClass(match.player2, 'right')}>{playerName(match.player2)}</span>

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
      {mine && !completed && lineup === 'waiting-rival' && (
        <span className="match-lineup-status">Esperando la alineación de {rival}</span>
      )}
      {mine && !completed && lineup === 'waiting-me' && (
        <span className="match-lineup-status">{rival} ya ha enviado su alineación</span>
      )}
      {opensLater && (
        <span className="match-lineup-status">
          Podrás declarar tu alineación desde {formatDayTime(lineupOpensAt!)}
        </span>
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
      <MatchLineups match={match} username={username} spriteIds={spriteIds} />
    </div>
  );
}
