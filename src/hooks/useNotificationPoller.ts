import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import { useToastStore } from '../store/toastStore';
import { getMyPendingTrades } from '../api/trades';
import { getMyLeagues } from '../api/leagues';
import { getActivityFeed } from '../api/activity';

export function useNotificationPoller() {
  const username = useAuthStore((s) => s.username);
  const addToast = useToastStore((s) => s.addToast);
  const queryClient = useQueryClient();

  const prevTradeCount = useRef<number | null>(null);
  const seenStealIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!username) return;

    async function poll(isInit: boolean) {
      // --- Trades ---
      const trades = await queryClient.fetchQuery({
        queryKey: ['my-pending-trades'],
        queryFn: getMyPendingTrades,
        staleTime: 25_000,
      });
      if (!isInit && prevTradeCount.current !== null && trades.length > prevTradeCount.current) {
        addToast('info', '🔔 Nueva propuesta de intercambio');
      }
      prevTradeCount.current = trades.length;

      // --- Robos ---
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
        for (const event of feed.events) {
          if (event.type === 'STEAL' && event.targetUsername === username) {
            if (!seenStealIds.current.has(event.id)) {
              seenStealIds.current.add(event.id);
              if (!isInit) {
                addToast('info', `🔥 ${event.actorUsername} te robó a ${event.pokemonName}`);
              }
            }
          }
        }
      }
    }

    // Primera pasada: poblar refs sin toastar
    poll(true);

    const interval = setInterval(() => poll(false), 30_000);
    return () => clearInterval(interval);
  }, [username, queryClient, addToast]);
}
