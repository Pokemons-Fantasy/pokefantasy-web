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

export interface ClosedListEntry {
  id: string;
  pokemonId: number;
  pokemonName: string;
  nominatedBy: string;
  sprite: string;
}

export interface DraftPick {
  username: string;
  pokemonName: string;
  pokemonId: number;
  round: number;
  pickedAt: string;
}

export interface DraftStatus {
  id: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  turnOrder: string[];
  currentTurn: string | null;
  currentRound: number;
  picks: DraftPick[];
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
