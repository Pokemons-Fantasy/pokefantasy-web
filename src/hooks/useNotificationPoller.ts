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

  const seenTradeIds = useRef<Set<string>>(new Set());
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
      for (const trade of trades) {
        if (!seenTradeIds.current.has(trade.id)) {
          seenTradeIds.current.add(trade.id);
          if (!isInit) {
            addToast(
              'info',
              `🔔 Nueva propuesta de intercambio de ${trade.proposer}`,
              `/leagues/${trade.leagueId}/activity`,
            );
          }
        }
      }

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
                addToast(
                  'info',
                  `🔥 ${event.actorUsername} te robó a ${event.pokemonName}`,
                  `/leagues/${league.id}/activity`,
                );
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
