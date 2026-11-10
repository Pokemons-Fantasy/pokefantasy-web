import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getMyPendingTrades } from '../../api/trades';
import { useAuthStore } from '../../store/authStore';

/** Intercambios pendientes por liga (id → número) y en total. Misma query y `staleTime` que la cabecera. */
export function usePendingTrades(): { byLeague: Map<string, number>; total: number } {
  const signedIn = useAuthStore((s) => !!s.username);
  const { data: pending = [] } = useQuery({
    queryKey: ['my-pending-trades'], queryFn: getMyPendingTrades, staleTime: 30_000, enabled: signedIn,
  });
  return useMemo(() => {
    const byLeague = new Map<string, number>();
    for (const t of pending) byLeague.set(t.leagueId, (byLeague.get(t.leagueId) ?? 0) + 1);
    return { byLeague, total: pending.length };
  }, [pending]);
}

export function pendingLabel(count: number): string {
  return count === 1 ? '1 intercambio pendiente' : `${count} intercambios pendientes`;
}
