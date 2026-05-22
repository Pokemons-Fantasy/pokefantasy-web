import { apiClient } from './client';

export interface Pokemon {
  name: string;
  id: number;
}

export interface AvailablePokemon {
  id: number;
  name: string;
  spriteUrl: string;
}

export type Tier = 'S' | 'A' | 'B' | 'C' | 'D';

export interface ClosedListEntry {
  id: string;
  pokemonId: number;
  pokemonName: string;
  nominatedBy: string;
  sprite: string;
  tier?: Tier | null;
}

export interface DraftPick {
  username: string;
  pokemonName: string;
  pokemonId: number;
  round: number;
  pickedAt: string;
  /** Custom steal price set by owner. null/undefined = use priceTierX default. */
  customStealPrice?: number | null;
  /** Round number of jornada when stolen. null/undefined = not locked. */
  lockedUntilRound?: number | null;
}

export interface DraftStatus {
  id: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  turnOrder: string[];
  currentTurn: string | null;
  currentRound: number;
  picks: DraftPick[];
  /** Draft original: lo que eligió cada jugador, inmune a robos/swaps/trades. */
  draftHistory?: DraftPick[];
}

export const getPokemons = async (): Promise<Pokemon[]> => {
  const { data } = await apiClient.get<Pokemon[]>('/v1/pokemons');
  return data;
};

export const getAvailablePokemons = async (): Promise<AvailablePokemon[]> => {
  const { data } = await apiClient.get<AvailablePokemon[]>('/v1/pokemons/available');
  return data;
};

export const nominatePokemon = async (leagueId: string, pokemonName: string): Promise<void> => {
  await apiClient.post(`/v1/leagues/${leagueId}/closed-list/nominate`, { pokemonName });
};

export const denominatePokemon = async (leagueId: string, pokemonName: string): Promise<void> => {
  await apiClient.delete(`/v1/leagues/${leagueId}/closed-list/nominate/${pokemonName}`);
};

export const getClosedList = async (leagueId: string): Promise<ClosedListEntry[]> => {
  const { data } = await apiClient.get<ClosedListEntry[]>(`/v1/leagues/${leagueId}/closed-list`);
  return data;
};

export const getDraftStatus = async (leagueId: string): Promise<DraftStatus | null> => {
  try {
    const { data } = await apiClient.get<DraftStatus>(`/v1/leagues/${leagueId}/draft`);
    return data;
  } catch {
    return null;
  }
};

export const draftPick = async (leagueId: string, pokemonName: string): Promise<void> => {
  await apiClient.post(`/v1/leagues/${leagueId}/draft/pick`, { pokemonName });
};

export const startDraft = async (leagueId: string, turnOrder: string[]): Promise<void> => {
  await apiClient.post(`/v1/leagues/${leagueId}/draft/start`, { turnOrder });
};

export const cancelDraft = async (leagueId: string): Promise<void> => {
  await apiClient.delete(`/v1/leagues/${leagueId}/draft`);
};

export interface BenchEntry {
  pokemonId: number;
  pokemonName: string;
  sprite: string;
  tier?: Tier | null;
  price?: number;  // 0 = free
}

export const getBench = async (leagueId: string): Promise<BenchEntry[]> => {
  const { data } = await apiClient.get<BenchEntry[]>(`/v1/leagues/${leagueId}/bench`);
  return data;
};

export const swapWithBench = async (
  leagueId: string,
  pokemonToGive: string,
  pokemonToTake: string
): Promise<void> => {
  await apiClient.post(`/v1/leagues/${leagueId}/bench/swap`, { pokemonToGive, pokemonToTake });
};

export const stealPokemon = async (leagueId: string, targetPokemonName: string): Promise<void> => {
  await apiClient.post(`/v1/leagues/${leagueId}/steal`, { targetPokemonName });
};

export const setStealPrice = async (
  leagueId: string,
  pokemonName: string,
  newPrice: number
): Promise<void> => {
  await apiClient.put(`/v1/leagues/${leagueId}/steal-price`, { pokemonName, newPrice });
};

export interface TierChange {
  pokemonId: number;
  pokemonName: string;
  oldTier: Tier;
  newTier: Tier;
}

export interface TierAdjustmentResponse {
  changes: TierChange[];
}

export const assignTier = async (
  leagueId: string,
  entryId: string,
  tier: Tier
): Promise<TierAdjustmentResponse> => {
  const { data } = await apiClient.put<TierAdjustmentResponse>(
    `/v1/leagues/${leagueId}/closed-list/${entryId}/tier`,
    { tier }
  );
  return data;
};
