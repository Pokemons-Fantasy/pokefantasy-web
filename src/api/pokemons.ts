import axios from 'axios';
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
  stats?: {
    hp: number;
    attack: number;
    defense: number;
    specialAttack: number;
    specialDefense: number;
    speed: number;
  } | null;
  types?: string[];
}

export interface DraftPick {
  username: string;
  pokemonName: string;
  pokemonId: number;
  round: number;
  pickedAt: string;
  /** Custom steal price set by owner. null/undefined = use priceTierX default. */
  customStealPrice?: number | null;
  /** ISO timestamp hasta el que este pokémon está bloqueado. null/undefined = libre. */
  lockedUntil?: string | null;
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
  /** ISO Instant deadline for current turn. null if timer disabled or draft not IN_PROGRESS. */
  turnDeadline?: string | null;
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

// Raw shapes from the backend (before transformation)
interface RawStat {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  base_stat: number;
  stat: { name: string; url: string };
}
interface RawType {
  type: { name: string; url: string };
}
interface RawClosedListEntry extends Omit<ClosedListEntry, 'stats' | 'types'> {
  stats?: RawStat[] | null;
  types?: RawType[];
}

function transformEntry(raw: RawClosedListEntry): ClosedListEntry {
  return {
    ...raw,
    types: raw.types?.map((t) => t.type.name),
    stats: raw.stats == null ? raw.stats : {
      hp:             raw.stats.find((s) => s.stat.name === 'hp')?.base_stat ?? 0,
      attack:         raw.stats.find((s) => s.stat.name === 'attack')?.base_stat ?? 0,
      defense:        raw.stats.find((s) => s.stat.name === 'defense')?.base_stat ?? 0,
      specialAttack:  raw.stats.find((s) => s.stat.name === 'special-attack')?.base_stat ?? 0,
      specialDefense: raw.stats.find((s) => s.stat.name === 'special-defense')?.base_stat ?? 0,
      speed:          raw.stats.find((s) => s.stat.name === 'speed')?.base_stat ?? 0,
    },
  };
}

export const getClosedList = async (leagueId: string): Promise<ClosedListEntry[]> => {
  const { data } = await apiClient.get<RawClosedListEntry[]>(`/v1/leagues/${leagueId}/closed-list`);
  return data.map(transformEntry);
};

export const getDraftStatus = async (leagueId: string): Promise<DraftStatus | null> => {
  try {
    const { data } = await apiClient.get<DraftStatus>(`/v1/leagues/${leagueId}/draft`);
    return data;
  } catch (err) {
    // El backend responde 409 (no 404) cuando la liga todavía no tiene draft —
    // ver GetDraftStatusCommandHandler/ApiExceptionHandler. Cualquier otro
    // error (red, 401, 500...) debe propagar para que React Query lo marque isError.
    if (axios.isAxiosError(err) && err.response?.status === 409) {
      return null;
    }
    throw err;
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

export const autoPickDraft = async (leagueId: string): Promise<void> => {
  await apiClient.post(`/v1/leagues/${leagueId}/draft/auto-pick`);
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

export const buyFromBench = async (leagueId: string, pokemonName: string): Promise<void> => {
  await apiClient.post(`/v1/leagues/${leagueId}/bench/buy`, { pokemonName });
};

export const releasePokemon = async (leagueId: string, pokemonName: string): Promise<void> => {
  await apiClient.post(`/v1/leagues/${leagueId}/bench/release`, { pokemonName });
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
