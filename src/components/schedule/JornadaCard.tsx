import type { Ref } from 'react';
import type { JornadaDto, MatchDto } from '../../api/leagues';
import { formatDay } from '../../utils/dates';
import { myResult, myResultText, type JornadaState } from '../../utils/schedule';
import MatchRow from './MatchRow';

interface JornadaCardProps {
  jornada: JornadaDto;
  state: JornadaState;
  /** "Jornada 1 · Primera vuelta". */
  label: string;
  username: string | null;
  isAdmin: boolean;
  /** Solo para las jugadas, que van plegadas. */
  expanded: boolean;
  onToggle: () => void;
  onRecord: (match: MatchDto) => void;
  onEdit: (match: MatchDto) => void;
  ref?: Ref<HTMLElement>;
}

/**
 * Una jornada del calendario. Las jugadas se pliegan en una fila con tu resultado; la actual se destaca;
 * las próximas se muestran desplegadas.
 */
export default function JornadaCard({
  jornada, state, label, username, isAdmin, expanded, onToggle, onRecord, onEdit, ref,
}: JornadaCardProps) {
  const n = jornada.roundNumber;
  const titleId = `jornada-${n}-title`;
  const matchesId = `jornada-${n}-matches`;
  const date = jornada.startDate && <span className="jornada-date">{formatDay(jornada.startDate)}</span>;

  const matches = (
    <div id={matchesId} className="jornada-matches">
      {jornada.matches.length === 0 && <p className="jornada-empty">Sin partidos esta jornada.</p>}
      {jornada.matches.map((match) => (
        <MatchRow
          key={match.id}
          match={match}
          username={username}
          isAdmin={isAdmin}
          onRecord={() => onRecord(match)}
          onEdit={() => onEdit(match)}
        />
      ))}
    </div>
  );

  if (state === 'played') {
    const result = myResult(jornada, username);
    const summary = result ? myResultText(result) : `${jornada.matches.length} partidos`;
    return (
      <section ref={ref} className="jornada-card played" aria-labelledby={titleId}>
        <h2 className="jornada-heading">
          <button
            type="button"
            id={titleId}
            className="jornada-toggle"
            aria-expanded={expanded}
            aria-controls={matchesId}
            aria-label={[label, jornada.startDate && formatDay(jornada.startDate), summary].filter(Boolean).join(', ')}
            onClick={onToggle}
          >
            <span className={`jornada-chevron${expanded ? ' open' : ''}`} aria-hidden="true">▸</span>
            <span className="jornada-title">{label}</span>
            {date}
            <span className={`jornada-result ${result?.kind ?? ''}`}>{summary}</span>
          </button>
        </h2>
        {expanded && matches}
      </section>
    );
  }

  return (
    <section ref={ref} className={`jornada-card ${state}`} aria-labelledby={titleId}>
      <div className="jornada-header">
        <h2 id={titleId} className="jornada-heading jornada-title">{label}</h2>
        {state === 'current' && <span className="jornada-current-tag">Jornada actual</span>}
        {date}
      </div>
      {matches}
    </section>
  );
}
