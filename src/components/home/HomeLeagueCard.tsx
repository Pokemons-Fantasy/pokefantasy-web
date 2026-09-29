import { Link } from 'react-router-dom';
import type { DraftStatus } from '../../api/pokemons';
import type { League, ScheduleResponse } from '../../api/leagues';
import { leaguePhase } from '../../utils/leaguePhase';
import { seasonSummary } from '../../utils/home';
import { myResultText } from '../../utils/schedule';
import { formatDay } from '../../utils/dates';
import LeaguePhaseBadge from '../LeaguePhaseBadge';
import MarketStatus from '../teams/MarketStatus';
import UserAvatar from '../avatar/UserAvatar';

interface HomeLeagueCardProps {
  league: League;
  username: string;
  /** Calendario (solo ligas en temporada); undefined mientras carga. */
  schedule?: ScheduleResponse | null;
  /** Estado del draft (solo ligas con el draft en curso); undefined mientras carga. */
  draft?: DraftStatus | null;
}

/** Una liga en la home, según su fase: temporada con tu partido, draft en curso o preparación. */
export default function HomeLeagueCard({ league, username, schedule, draft }: HomeLeagueCardProps) {
  const phase = leaguePhase(league.draftStatus);
  const base = `/leagues/${league.id}`;

  if (phase === 'season') return <SeasonCard league={league} username={username} schedule={schedule} base={base} />;

  if (phase === 'draft') {
    const myTurn = draft?.currentTurn === username;
    return (
      <Link className="home-league home-league-draft" to={`${base}/draft`}>
        <span className="home-live-dot" aria-hidden="true" />
        <div className="home-league-head">
          <h3 className="home-league-name">{league.name}</h3>
          <LeaguePhaseBadge draftStatus={league.draftStatus} />
        </div>
        {draft?.currentTurn && (
          <p className={`home-league-line${myTurn ? ' home-my-turn' : ''}`}>
            {myTurn ? '¡Te toca elegir!' : `Turno de ${draft.currentTurn}`}
          </p>
        )}
        <span className="home-league-cta">Ir al draft →</span>
      </Link>
    );
  }

  return (
    <Link className="home-league home-league-compact" to={base}>
      <h3 className="home-league-name">{league.name}</h3>
      <LeaguePhaseBadge draftStatus={league.draftStatus} />
      <span className="home-league-cta">Continuar →</span>
    </Link>
  );
}

function SeasonCard({ league, username, schedule, base }: {
  league: League; username: string; schedule: ScheduleResponse | null | undefined; base: string;
}) {
  const summary = schedule ? seasonSummary(schedule, username) : null;
  const nextIsCurrent = !!summary?.next && summary.next.roundNumber === summary.current?.roundNumber;

  return (
    <article className="home-league home-league-season">
      <div className="home-league-head">
        <h3 className="home-league-name">
          <Link className="row-link" to={base}>{league.name}</Link>
        </h3>
        <LeaguePhaseBadge draftStatus={league.draftStatus} />
      </div>

      {schedule === undefined && <div className="skeleton home-league-skeleton" aria-hidden="true" />}
      {schedule === null && <p className="home-league-line">Todavía no hay calendario.</p>}

      {summary && (
        <>
          <p className="home-league-round">
            {summary.current
              ? `Jornada ${summary.current.roundNumber}${summary.current.startDate ? ` · ${formatDay(summary.current.startDate)}` : ''}`
              : 'Temporada terminada'}
          </p>

          {summary.next && nextIsCurrent && (
            <div className="home-match" aria-label={`Tu partido: ${username} contra ${summary.next.opponent}`}>
              <span className="home-match-player">
                <UserAvatar username={username} size={30} />
                <span className="home-match-name">{username}</span>
              </span>
              <span className="home-match-vs" aria-hidden="true">vs</span>
              <span className="home-match-player">
                <UserAvatar username={summary.next.opponent} size={30} />
                <span className="home-match-name">{summary.next.opponent}</span>
              </span>
            </div>
          )}
          {summary.current && !nextIsCurrent && (
            <p className="home-league-line">
              {summary.resting ? 'Descansas esta jornada' : 'Ya has jugado esta jornada'}
              {summary.next && ` · Próximo: ${summary.next.opponent} (jornada ${summary.next.roundNumber})`}
            </p>
          )}

          {summary.last && <p className="home-league-last">Último: {myResultText(summary.last)}</p>}

          {summary.current && schedule && <MarketStatus schedule={schedule} />}
        </>
      )}

      <nav className="home-league-links" aria-label={`Ir a ${league.name}`}>
        <Link to={`${base}/schedule`}>Calendario</Link>
        <Link to={`${base}/teams`}>Equipos</Link>
      </nav>
    </article>
  );
}
