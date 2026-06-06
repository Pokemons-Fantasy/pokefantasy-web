import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import { useToastStore } from '../store/toastStore';
import { getMyPendingTrades } from '../api/trades';
import { getMyLeagues } from '../api/leagues';
import { getActivityFeed } from '../api/activity';

const API_BASE = import.meta.env.VITE_API_URL ?? 'https://pokefantasy.onrender.com';

export function useNotificationSse() {
  const username = useAuthStore((s) => s.username);
  const token = useAuthStore((s) => s.token);
  const addToast = useToastStore((s) => s.addToast);
  const queryClient = useQueryClient();

  const seenTradeIds = useRef<Set<string>>(new Set());
  const seenStealIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!username || !token) return;

    // --- Init: populate refs without toasting ---
    async function initRefs() {
      const trades = await queryClient.fetchQuery({
        queryKey: ['my-pending-trades'],
        queryFn: getMyPendingTrades,
        staleTime: 25_000,
      });
      trades.forEach((t) => seenTradeIds.current.add(t.id));

      const leagues = await queryClient.fetchQuery({
        queryKey: ['my-leagues'],
        queryFn: getMyLeagues,
        staleTime: 55_000,
      });
      for (const league of leagues) {
        const feed = await queryClient.fetchQuery({
          queryKey: ['activity-feed-poll', league.id],
          queryFn: () => getActivityFeed(league.id, 0),
          staleTime: 25_000,
        });
        feed.events
          .filter((e) => e.type === 'STEAL' && e.targetUsername === username)
          .forEach((e) => seenStealIds.current.add(e.id));
      }
    }

    let fallbackInterval: ReturnType<typeof setInterval> | null = null;

    // --- SSE ---
    const es = new EventSource(`${API_BASE}/v1/users/events?token=${token}`);

    es.addEventListener('steal', (e: MessageEvent) => {
      const data = JSON.parse(e.data) as {
        leagueId: string;
        actorUsername: string;
        pokemonName: string;
      };
      const key = e.lastEventId || `${data.actorUsername}-${data.pokemonName}-${data.leagueId}`;
      if (!seenStealIds.current.has(key)) {
        seenStealIds.current.add(key);
        addToast(
          'info',
          `${data.actorUsername} te robó a ${data.pokemonName}`,
          `/leagues/${data.leagueId}/activity`,
        );
        queryClient.invalidateQueries({ queryKey: ['activity-feed-poll', data.leagueId] });
        queryClient.invalidateQueries({ queryKey: ['draft-status', data.leagueId] });
      }
    });

    es.addEventListener('trade-proposed', (e: MessageEvent) => {
      const data = JSON.parse(e.data) as {
        leagueId: string;
        proposer: string;
        tradeId: string;
      };
      if (!seenTradeIds.current.has(data.tradeId)) {
        seenTradeIds.current.add(data.tradeId);
        addToast(
          'info',
          `Nueva propuesta de intercambio de ${data.proposer}`,
          `/leagues/${data.leagueId}/activity`,
        );
        queryClient.invalidateQueries({ queryKey: ['my-pending-trades'] });
      }
    });

    es.onerror = () => {
      es.close(); // stop browser auto-reconnect; fallback polling takes over
      // SSE dropped — activate fallback polling at 120s
      if (!fallbackInterval) {
        fallbackInterval = setInterval(async () => {
          try {
            const trades = await queryClient.fetchQuery({
              queryKey: ['my-pending-trades'],
              queryFn: getMyPendingTrades,
              staleTime: 25_000,
            });
            for (const trade of trades) {
              if (!seenTradeIds.current.has(trade.id)) {
                seenTradeIds.current.add(trade.id);
                addToast(
                  'info',
                  `Nueva propuesta de intercambio de ${trade.proposer}`,
                  `/leagues/${trade.leagueId}/activity`,
                );
              }
            }
          } catch (_) {
            // network unavailable — retry next tick
          }
        }, 120_000);
      }
    };

    es.onopen = () => {
      // SSE reconnected — stop fallback
      if (fallbackInterval) {
        clearInterval(fallbackInterval);
        fallbackInterval = null;
      }
    };

    initRefs();

    return () => {
      es.close();
      if (fallbackInterval) clearInterval(fallbackInterval);
    };
  }, [username, token, queryClient, addToast]);
}
