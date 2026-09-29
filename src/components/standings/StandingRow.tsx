import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { PlayerStanding } from '../../api/leagues';
import type { FormResult, Tiebreak } from '../../utils/standings';
import { formatDiff } from '../../utils/score';
import UserAvatar from '../avatar/UserAvatar';

interface StandingRowProps {
  row: PlayerStanding;
  pos: number;
  isMe: boolean;
  showDiff: boolean;
  /** Datos que han decidido un empate a victorias con el de arriba o el de abajo. */
  decisive: Set<Tiebreak> | undefined;
  form: FormResult[];
  to: string;
  onNavigate: () => void;
}

const FORM_LABEL: Record<FormResult, string> = { W: 'V', L: 'D' };

/** Valor resaltado cuando es el que ha decidido un empate. */
function Decisive({ active, children }: { active: boolean; children: ReactNode }) {
  if (!active) return <>{children}</>;
  return (
    <span className="standing-decisive" title="Decide el desempate">
      {children}
      <span className="sr-only"> (decide el desempate)</span>
    </span>
  );
}

export default function StandingRow({ row, pos, isMe, showDiff, decisive, form, to, onNavigate }: StandingRowProps) {
  const diffClass = row.scoreDiff > 0 ? 'positive' : row.scoreDiff < 0 ? 'negative' : '';

  return (
    <tr className={`standing-row${isMe ? ' me' : ''}`} onClick={onNavigate}>
      <td className="standing-pos-cell">
        <span className={`standing-pos${pos <= 3 ? ` top-${pos}` : ''}`}>{pos}</span>
      </td>
      <td className="standing-player">
        <div className="standing-player-inner">
          <UserAvatar username={row.username} size={28} />
          <div className="standing-player-text">
            <div className="standing-name-line">
              <Link to={to} className="row-link standing-name" title={row.username} onClick={(e) => e.stopPropagation()}>
                {row.username}
              </Link>
              {isMe && <span className="standing-me">Tú</span>}
            </div>
            {form.length > 0 && (
              <span
                className="standing-form"
                role="img"
                aria-label={`Últimos partidos: ${form.map((r) => FORM_LABEL[r]).join(', ')}`}
              >
                {form.map((r, i) => <span key={i} className={`form-dot ${r === 'W' ? 'win' : 'loss'}`} />)}
              </span>
            )}
          </div>
        </div>
      </td>
      <td className="standing-num standing-played">{row.played}</td>
      <td className="standing-num standing-wins">{row.wins}</td>
      <td className="standing-num standing-losses">{row.losses}</td>
      {showDiff && (
        <td className={`standing-num standing-diff ${diffClass}`} title={`${row.scoreFor} a favor, ${row.scoreAgainst} en contra`}>
          <Decisive active={!!decisive?.has('diff')}>{formatDiff(row.scoreDiff)}</Decisive>
        </td>
      )}
      <td className="standing-num standing-coins">
        <Decisive active={!!decisive?.has('coins')}>{row.coins}</Decisive>
      </td>
    </tr>
  );
}
