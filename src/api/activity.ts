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
    | 'COIN_REVOKED'
    | 'DRAFT_COINS';
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

/**
 * Feed de la liga. `username`: solo los eventos de ese jugador. `types`: solo esos tipos (el backend
 * anterior ignora el parámetro y devuelve todos).
 */
export const getActivityFeed = async (
  leagueId: string,
  page: number,
  options?: { username?: string; types?: ActivityEvent['type'][] }
): Promise<ActivityFeedResponse> => {
  const { data } = await apiClient.get<ActivityFeedResponse>(
    `/v1/leagues/${leagueId}/activity`,
    {
      params: {
        page,
        size: 20,
        ...(options?.username ? { username: options.username } : {}),
        // Separados por comas: Spring no entiende la forma por defecto de Axios (types[]=...)
        ...(options?.types?.length ? { types: options.types.join(',') } : {}),
      },
    }
  );
  return data;
};
