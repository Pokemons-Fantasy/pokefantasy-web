import { Navigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getDraftStatus } from '../../api/pokemons';
import { leaguePhase } from '../../utils/leaguePhase';
import { firstTab } from '../../utils/leagueNav';
import { SkeletonTable } from '../SkeletonTable';

/** /leagues/:leagueId lleva a la primera pestaña de la fase (enlaces antiguos, invitaciones, push). */
export default function LeagueIndexRedirect() {
  const { leagueId } = useParams<{ leagueId: string }>();
  const { data: draft, isLoading } = useQuery({
    queryKey: ['draft-status', leagueId],
    queryFn: () => getDraftStatus(leagueId!),
    enabled: !!leagueId,
  });

  if (isLoading) {
    return <main className="page-content"><SkeletonTable rows={4} /></main>;
  }
  return <Navigate to={firstTab(leaguePhase(draft?.status ?? null))} replace />;
}
