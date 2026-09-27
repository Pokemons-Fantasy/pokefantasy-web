import type { LeagueDraftStatus } from '../api/leagues';
import { leaguePhase, LEAGUE_PHASES } from '../utils/leaguePhase';

export default function LeaguePhaseBadge({ draftStatus }: { draftStatus: LeagueDraftStatus | undefined }) {
  const { label, badge } = LEAGUE_PHASES[leaguePhase(draftStatus)];
  return <span className={`badge badge-${badge}`}>{label}</span>;
}
