import { apiClient } from './client';

export type TradeStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED';

export interface Trade {
  id: string;
  leagueId: string;
  proposer: string;
  responder: string;
  proposerPokemonName: string;
  proposerPokemonId: number;
  responderPokemonName: string;
  responderPokemonId: number;
  coinsOffered: number;
  status: TradeStatus;
  createdAt: string;
  resolvedAt?: string | null;
}

export interface ProposeTradePayload {
  responder: string;
  proposerPokemonName: string;
  responderPokemonName: string;
  coinsOffered: number;
}

export const getTrades = async (leagueId: string): Promise<Trade[]> => {
  const { data } = await apiClient.get<Trade[]>(`/v1/leagues/${leagueId}/trades`);
  return data;
};

export const proposeTrade = async (
  leagueId: string,
  payload: ProposeTradePayload
): Promise<void> => {
  await apiClient.post(`/v1/leagues/${leagueId}/trades`, payload);
};

export const respondToTrade = async (
  leagueId: string,
  tradeId: string,
  accept: boolean
): Promise<void> => {
  await apiClient.post(`/v1/leagues/${leagueId}/trades/${tradeId}/respond`, { accept });
};

export const cancelTrade = async (leagueId: string, tradeId: string): Promise<void> => {
  await apiClient.delete(`/v1/leagues/${leagueId}/trades/${tradeId}`);
};
