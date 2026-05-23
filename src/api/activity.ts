import { apiClient } from './client';

export interface ActivityEvent {
  id: string;
  type: 'STEAL' | 'BENCH_SWAP' | 'BENCH_PURCHASE' | 'TRADE_COMPLETED' | 'MATCH_RESULT' | 'TIER_CHANGE' | 'COIN_EARNED';
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

export const getActivityFeed = async (leagueId: string, page: number): Promise<ActivityFeedResponse> => {
  const { data } = await apiClient.get<ActivityFeedResponse>(
    `/v1/leagues/${leagueId}/activity`,
    { params: { page, size: 20 } }
  );
  return data;
};
