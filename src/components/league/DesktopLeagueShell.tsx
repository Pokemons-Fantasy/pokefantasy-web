import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { LeagueDetail, LeagueDraftStatus } from '../../api/leagues';
import type { LeaguePhase } from '../../utils/leaguePhase';
import { leagueMenu, leagueTabs } from '../../utils/leagueNav';
import PageHeader from '../PageHeader';
import LeaguePhaseBadge from '../LeaguePhaseBadge';
import LeagueTabs from './LeagueTabs';
import LeagueMenu from './LeagueMenu';

/** Lo que `LeagueLayout` pasa a cualquiera de sus dos marcos (escritorio y móvil). */
export interface LeagueShellProps {
  league: LeagueDetail;
  draftStatus: LeagueDraftStatus | undefined;
  phase: LeaguePhase;
  loadingDraft: boolean;
  isAdmin: boolean;
  /** Sección actual (ver activeSection). */
  section: string;
  children: ReactNode;
}

/** Marco de la liga en escritorio: cabecera, barra con nombre y fase, pestañas y menú de engranaje. */
export default function DesktopLeagueShell({ league, draftStatus, phase, loadingDraft, isAdmin, section, children }: LeagueShellProps) {
  return (
    <div className="page-wrapper league-page">
      <PageHeader left={
        <div className="header-left">
          <Link className="btn-back" to="/leagues">← Mis ligas</Link>
          <Link className="logo" to="/">PokeFantasy</Link>
        </div>
      } />
      <div className="league-bar">
        <div className="league-bar-inner">
          <div className="league-bar-title">
            <span className="league-bar-name">{league.name}</span>
            {!loadingDraft && <LeaguePhaseBadge draftStatus={draftStatus} />}
          </div>
          {!loadingDraft && <LeagueMenu items={leagueMenu(phase, isAdmin)} active={section} />}
        </div>
      </div>
      <div className="league-tabs-bar">
        {!loadingDraft && <LeagueTabs tabs={leagueTabs(phase)} active={section} />}
      </div>
      {children}
    </div>
  );
}
