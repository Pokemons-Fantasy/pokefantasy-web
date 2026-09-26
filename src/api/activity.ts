import { apiClient } from './client';

export interface ActivityEvent {
  id: string;
  type:
    | 'STEAL'
    | 'BENCH_SWAP'
    | 'BENCH_PURCHASE'
    | 'POKEMON_RELEASED'
    | 'TRADE_COMPLETED'
    | 'MATCH_RESULT'
    | 'MATCH_RESULT_REVERTED'
    | 'TIER_CHANGE'
    | 'COIN_EARNED'
    | 'COIN_REVOKED';
  actorUsername: string;
  targetUsername?: string;
  pokemonName?: string;
  pokemonName2?: string;
  coinsAmount?: number;
  fromTier?: string;
  toTier?: string;
  roundNumber?: number;
  createdAt: string;
}

export interface ActivityFeedResponse {
  events: ActivityEvent[];
  page: number;
  totalPages: number;
  hasMore: boolean;
}

export const getActivityFeed = async (
  leagueId: string,
  page: number,
  options?: { username?: string }
): Promise<ActivityFeedResponse> => {
  const { data } = await apiClient.get<ActivityFeedResponse>(
    `/v1/leagues/${leagueId}/activity`,
    { params: { page, size: 20, ...(options?.username ? { username: options.username } : {}) } }
  );
  return data;
};
