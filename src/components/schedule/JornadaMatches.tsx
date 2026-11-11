import type { JornadaDto, MatchDto } from '../../api/leagues';
import MatchRow from './MatchRow';

interface JornadaMatchesProps {
  id?: string;
  /** Partidos a pintar, en el orden en que se reciben (la vista móvil pone el tuyo aparte). */
  matches: MatchDto[];
  jornada: JornadaDto;
  username: string | null;
  isAdmin: boolean;
  onRecord: (match: MatchDto) => void;
  onEdit: (match: MatchDto) => void;
  onPlay: (match: MatchDto) => void;
  onLineup: (match: MatchDto) => void;
  onImport: (match: MatchDto) => void;
  spriteIds: Map<string, number>;
  /** Texto si no hay partidos; sin él, no se pinta nada. */
  emptyText?: string;
}

/** Lista de partidos de una jornada con sus acciones. La usan la tarjeta de escritorio y la vista móvil. */
export default function JornadaMatches({
  id, matches, jornada, username, isAdmin, onRecord, onEdit, onPlay, onLineup, onImport, spriteIds, emptyText,
}: JornadaMatchesProps) {
  return (
    <div id={id} className="jornada-matches">
      {matches.length === 0 && emptyText && <p className="jornada-empty">{emptyText}</p>}
      {matches.map((match) => (
        <MatchRow
          key={match.id}
          match={match}
          username={username}
          isAdmin={isAdmin}
          onRecord={() => onRecord(match)}
          onEdit={() => onEdit(match)}
          onPlay={() => onPlay(match)}
          onLineup={() => onLineup(match)}
          onImport={() => onImport(match)}
          lineupOpensAt={jornada.lineupOpensAt}
          spriteIds={spriteIds}
        />
      ))}
    </div>
  );
}
