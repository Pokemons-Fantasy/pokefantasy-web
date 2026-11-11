import { useEffect, useMemo } from 'react';
import { Outlet, useLocation, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getLeagueDetail } from '../../api/leagues';
import { getDraftStatus } from '../../api/pokemons';
import { useAuthStore } from '../../store/authStore';
import { leaguePhase } from '../../utils/leaguePhase';
import { activeSection } from '../../utils/leagueNav';
import { setLastLeague } from '../../utils/lastLeague';
import { useLayoutMode } from '../../hooks/useLayoutMode';
import PageHeader from '../PageHeader';
import { SkeletonTable } from '../SkeletonTable';
import DesktopLeagueShell from './DesktopLeagueShell';
import MobileLeagueShell from '../shell/MobileLeagueShell';
import { AvatarVersionsContext } from '../avatar/AvatarVersionsContext';

/** Marco común de /leagues/:leagueId/*: carga la liga y su fase y elige el marco de escritorio o el de móvil. */
export default function LeagueLayout() {
  const { leagueId } = useParams<{ leagueId: string }>();
  const { pathname } = useLocation();
  const username = useAuthStore((s) => s.username);
  const layoutMode = useLayoutMode();

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

  useEffect(() => {
    if (league) setLastLeague(league.id);
  }, [league]);

  if (!league) {
    return (
      <div className="page-wrapper league-page">
        <PageHeader />
        <main className="page-content">
          {isLoading ? <SkeletonTable rows={4} /> : <p className="error">Liga no encontrada</p>}
        </main>
      </div>
    );
  }

  const Shell = layoutMode === 'mobile' ? MobileLeagueShell : DesktopLeagueShell;
  return (
    <Shell
      league={league}
      draftStatus={draft?.status ?? null}
      phase={phase}
      loadingDraft={loadingDraft}
      isAdmin={isAdmin}
      section={section}
    >
      <AvatarVersionsContext.Provider value={avatarVersions}>
        <Outlet />
      </AvatarVersionsContext.Provider>
    </Shell>
  );
}
