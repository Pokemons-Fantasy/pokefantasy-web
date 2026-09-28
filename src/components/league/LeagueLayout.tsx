import { useMemo } from 'react';
import { Link, Outlet, useLocation, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getLeagueDetail } from '../../api/leagues';
import { getDraftStatus } from '../../api/pokemons';
import { useAuthStore } from '../../store/authStore';
import { leaguePhase } from '../../utils/leaguePhase';
import { activeSection, leagueMenu, leagueTabs } from '../../utils/leagueNav';
import PageHeader from '../PageHeader';
import LeaguePhaseBadge from '../LeaguePhaseBadge';
import { SkeletonTable } from '../SkeletonTable';
import LeagueTabs from './LeagueTabs';
import LeagueMenu from './LeagueMenu';
import { AvatarVersionsContext } from '../avatar/AvatarVersionsContext';

/** Marco común de /leagues/:leagueId/*: cabecera, nombre y fase, pestañas y menú. */
export default function LeagueLayout() {
  const { leagueId } = useParams<{ leagueId: string }>();
  const { pathname } = useLocation();
  const username = useAuthStore((s) => s.username);

  // Mismas query keys que las páginas: la caché se comparte, no hay llamadas extra.
  const { data: league, isLoading } = useQuery({
    queryKey: ['league-detail', leagueId],
    queryFn: () => getLeagueDetail(leagueId!),
    enabled: !!leagueId,
  });
  const { data: draft, isLoading: loadingDraft } = useQuery({
    queryKey: ['draft-status', leagueId],
    queryFn: () => getDraftStatus(leagueId!),
    enabled: !!leagueId,
  });

  // Versión de la foto de cada miembro para los avatares de las páginas de la liga.
  const avatarVersions = useMemo(
    () => new Map(league?.members.map((m) => [m.username, m.avatarVersion ?? null] as const) ?? []),
    [league],
  );

  const phase = leaguePhase(draft?.status ?? null);
  const isAdmin = !!league?.members.some((m) => m.username === username && m.leagueRole === 'ADMIN');
  const base = `/leagues/${leagueId}`;
  const section = activeSection(pathname.slice(base.length + 1));

  return (
    <div className="page-wrapper league-page">
      <PageHeader left={
        <div className="header-left">
          <Link className="btn-back" to="/leagues">← Mis ligas</Link>
          <Link className="logo" to="/">PokeFantasy</Link>
        </div>
      } />

      {isLoading && (
        <main className="page-content"><SkeletonTable rows={4} /></main>
      )}

      {!isLoading && !league && (
        <main className="page-content"><p className="error">Liga no encontrada</p></main>
      )}

      {league && (
        <>
          <div className="league-bar">
            <div className="league-bar-inner">
              <div className="league-bar-title">
                <span className="league-bar-name">{league.name}</span>
                {!loadingDraft && <LeaguePhaseBadge draftStatus={draft?.status ?? null} />}
              </div>
              {!loadingDraft && <LeagueMenu items={leagueMenu(phase, isAdmin)} active={section} />}
            </div>
          </div>
          <div className="league-tabs-bar">
            {!loadingDraft && <LeagueTabs tabs={leagueTabs(phase)} active={section} />}
          </div>
          <AvatarVersionsContext.Provider value={avatarVersions}>
            <Outlet />
          </AvatarVersionsContext.Provider>
        </>
      )}
    </div>
  );
}
