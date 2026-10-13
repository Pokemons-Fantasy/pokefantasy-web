import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, Navigate, useParams } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { getClosedList, getDraftStatus, assignTiers } from '../api/pokemons';
import type { Tier } from '../api/pokemons';
import { getLeagueDetail } from '../api/leagues';
import { useToastStore } from '../store/toastStore';
import { extractErrorMessage } from '../utils/errorMessage';
import { SkeletonGrid } from '../components/SkeletonGrid';
import SetupTierBoard from '../components/draftSetup/SetupTierBoard';

export default function TierManagementPage() {
  const { leagueId } = useParams<{ leagueId: string }>();
  const username = useAuthStore((s) => s.username);
  const queryClient = useQueryClient();

  const addToast = useToastStore((s) => s.addToast);

  const { data: closedList = [], isLoading: loadingList } = useQuery({
    queryKey: ['closed-list', leagueId],
    queryFn: () => getClosedList(leagueId!),
    enabled: !!leagueId,
    staleTime: 30_000,
  });

  const { data: draft } = useQuery({
    queryKey: ['draft-status', leagueId],
    queryFn: () => getDraftStatus(leagueId!),
    enabled: !!leagueId,
    staleTime: 30_000,
  });

  const { data: league } = useQuery({
    queryKey: ['league-detail', leagueId],
    queryFn: () => getLeagueDetail(leagueId!),
    enabled: !!leagueId,
    staleTime: 60_000,
  });

  const isAdmin = league?.members.some(
    (m) => m.username === username && m.leagueRole === 'ADMIN'
  ) ?? false;

  const isDraftCompleted = draft?.status === 'COMPLETED';

  // Solo se mueven los elegidos: los conteos de cada tier pueden cambiar.
  const { mutate: doAdjust, isPending: adjusting } = useMutation({
    mutationFn: ({ entryIds, tier }: { entryIds: string[]; tier: Tier }) =>
      assignTiers(leagueId!, entryIds, tier),
    onSuccess: (data, { tier }) => {
      const n = data.changes.length;
      addToast('success', `${n} ${n === 1 ? 'Pokémon movido' : 'Pokémon movidos'} a ${tier}`);
      queryClient.invalidateQueries({ queryKey: ['closed-list', leagueId] });
    },
    onError: (err) => addToast('error', extractErrorMessage(err, 'Error al ajustar tiers')),
  });

  // Redirect if not admin (once data is loaded) — tras todos los hooks, nunca antes.
  if (league && !isAdmin) {
    return <Navigate to={`/leagues/${leagueId}`} replace />;
  }

  return (
    <main className="page-content">
      <h1 className="page-title">Gestión de tiers</h1>

      {!isDraftCompleted && (
        <div className="empty-state">
          <p>El draft debe estar completado para ajustar tiers.</p>
          <Link className="btn-ghost" to={`/leagues/${leagueId}`}>
            Volver a la liga
          </Link>
        </div>
      )}

      {isDraftCompleted && (loadingList ? (
        <SkeletonGrid count={6} />
      ) : (
        <SetupTierBoard
          pool={closedList}
          moving={adjusting}
          onMove={(entryIds, tier) => doAdjust({ entryIds, tier })}
        />
      ))}
    </main>
  );
}
