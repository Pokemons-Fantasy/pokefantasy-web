import type { MatchDto } from '../../api/leagues';
import { scoreLabel } from '../../utils/score';

interface MatchRowProps {
  match: MatchDto;
  username: string | null;
  isAdmin: boolean;
  onRecord: () => void;
  onEdit: () => void;
}

export default function MatchRow({ match, username, isAdmin, onRecord, onEdit }: MatchRowProps) {
  const completed = match.status === 'COMPLETED';
  const mine = !!username && (match.player1 === username || match.player2 === username);

  function playerClass(player: string, side: 'left' | 'right') {
    const result = !completed ? '' : match.winnerUsername === player ? ' winner' : ' loser';
    return `match-player ${side}${result}${player === username ? ' me' : ''}`;
  }

  function playerName(player: string) {
    return <>{completed && match.winnerUsername === player && '✓ '}{player}</>;
  }

  return (
    <div className={`match-row${mine ? ' mine' : ''}`} data-testid={`match-${match.id}`}>
      <span className={playerClass(match.player1, 'left')}>{playerName(match.player1)}</span>
      <span className={`match-badge${completed ? ' done' : ''}`}>
        {completed ? scoreLabel(match) ?? 'FIN' : 'vs'}
      </span>
      <span className={playerClass(match.player2, 'right')}>{playerName(match.player2)}</span>

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
  );
}
