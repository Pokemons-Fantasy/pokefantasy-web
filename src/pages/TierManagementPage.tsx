import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, Navigate, useParams } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { getClosedList, getDraftStatus, assignTiers } from '../api/pokemons';
import type { Tier, TierChange } from '../api/pokemons';
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
  const [lastChanges, setLastChanges] = useState<TierChange[]>([]);

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

  const { mutate: doAdjust, isPending: adjusting } = useMutation({
    mutationFn: ({ entryIds, tier }: { entryIds: string[]; tier: Tier }) =>
      assignTiers(leagueId!, entryIds, tier),
    onSuccess: (data) => {
      setLastChanges(data.changes);
      addToast('success', 'Tiers ajustados');
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

      {isDraftCompleted && (
        <>
          {/* Last changes panel */}
          {lastChanges.length > 0 && (
            <div role="status" style={{
              padding: '0.75rem 1rem',
              borderRadius: 10,
              background: 'var(--success-bg)',
              border: '1px solid var(--success-border)',
              fontSize: '0.82rem',
              marginBottom: '1.25rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.2rem',
            }}>
              <div style={{ fontWeight: 600, color: 'var(--success)', marginBottom: '0.25rem' }}>
                Tiers actualizados
              </div>
              {lastChanges.map((c) => (
                <div key={c.pokemonId} style={{ color: 'var(--text-2)', textTransform: 'capitalize' }}>
                  {c.pokemonName}: {c.oldTier} → {c.newTier}
                </div>
              ))}
              <button
                className="btn-ghost"
                style={{ alignSelf: 'flex-start', marginTop: '0.35rem', fontSize: '0.75rem', padding: '0.15rem 0.5rem' }}
                onClick={() => setLastChanges([])}
              >
                Cerrar
              </button>
            </div>
          )}

          {loadingList ? (
            <SkeletonGrid count={6} />
          ) : (
            <SetupTierBoard
              pool={closedList}
              moving={adjusting}
              cascade
              onMove={(entryIds, tier) => { setLastChanges([]); doAdjust({ entryIds, tier }); }}
            />
          )}
        </>
      )}
    </main>
  );
}
