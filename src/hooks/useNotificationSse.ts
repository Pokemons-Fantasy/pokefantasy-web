import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import { useToastStore } from '../store/toastStore';
import { getMyPendingTrades } from '../api/trades';
import { getMyLeagues } from '../api/leagues';
import { getActivityFeed } from '../api/activity';
import { openEventStream } from '../api/sse';

export function useNotificationSse() {
  const username = useAuthStore((s) => s.username);
  const addToast = useToastStore((s) => s.addToast);
  const queryClient = useQueryClient();

  const seenTradeIds = useRef<Set<string>>(new Set());
  const seenStealIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!username) return;

    let ready = false; // hasta cargar lo ya existente, nada se anuncia como nuevo

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

    // Propuestas de intercambio que no se han visto: tras una reconexión y en el polling de respaldo
    async function checkTrades() {
      if (!ready) return;
      try {
        const trades = await queryClient.fetchQuery({
          queryKey: ['my-pending-trades'],
          queryFn: getMyPendingTrades,
          staleTime: 0,
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
      } catch {
        // network unavailable — retry next tick or reconnection
      }
    }

    let fallbackInterval: ReturnType<typeof setInterval> | null = null;
    const stopFallback = () => {
      if (fallbackInterval) clearInterval(fallbackInterval);
      fallbackInterval = null;
    };

    // --- SSE --- El proxy de Netlify corta la conexión cada <26 s: se reconecta sola; mientras está
    // caída, polling cada 120 s.
    const close = openEventStream('/v1/users/events', {
      listeners: {
        steal: (e) => {
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
              `${data.actorUsername} te ha robado a ${data.pokemonName}`,
              `/leagues/${data.leagueId}/activity`,
            );
            queryClient.invalidateQueries({ queryKey: ['activity-feed-poll', data.leagueId] });
            queryClient.invalidateQueries({ queryKey: ['draft-status', data.leagueId] });
          }
        },
        'trade-proposed': (e) => {
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
        },
      },
      onOpen: (reconnected) => {
        stopFallback();
        if (reconnected) checkTrades();
      },
      onDown: () => {
        if (!fallbackInterval) fallbackInterval = setInterval(checkTrades, 120_000);
      },
    });

    // Si la carga inicial falla (red), se sigue igualmente: como mucho se anuncia algo ya existente
    initRefs()
      .catch(() => {})
      .finally(() => {
        ready = true;
      });

    return () => {
      close();
      stopFallback();
    };
  }, [username, queryClient, addToast]);
}
