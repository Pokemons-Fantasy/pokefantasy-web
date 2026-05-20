import { apiClient } from './client';

export interface League {
  id: string;
  name: string;
  createdBy: string;
  memberCount: number;
  status: 'SETUP' | 'ACTIVE';
}

export interface LeagueMember {
  username: string;
  leagueRole: 'ADMIN' | 'USER';
}

export interface LeagueDetail {
  id: string;
  name: string;
  createdBy: string;
  members: LeagueMember[];
  status: 'SETUP' | 'ACTIVE';
}

export const createLeague = async (name: string): Promise<string> => {
  const { data } = await apiClient.post<string>('/v1/leagues', { name });
  return data;
};

export const addMember = async (leagueId: string, username: string): Promise<void> => {
  await apiClient.post(`/v1/leagues/${leagueId}/members`, { username });
};

export const getMyLeagues = async (): Promise<League[]> => {
  const { data } = await apiClient.get<League[]>('/v1/leagues/my');
  return data;
};

export const getLeagueDetail = async (leagueId: string): Promise<LeagueDetail> => {
  const { data } = await apiClient.get<LeagueDetail>(`/v1/leagues/${leagueId}`);
  return data;
};

export const removeMember = async (leagueId: string, username: string): Promise<void> => {
  await apiClient.delete(`/v1/leagues/${leagueId}/members/${username}`);
};

// ── Settings ──────────────────────────────────────────────────────────────────

export interface LeagueSettings {
  coinsPerWin: number;
  coinsPerLoss: number;
  priceTierS: number;
  priceTierA: number;
  priceTierB: number;
  priceTierC: number;
  priceTierD: number;
}

export const getLeagueSettings = async (leagueId: string): Promise<LeagueSettings> => {
  const { data } = await apiClient.get<LeagueSettings>(`/v1/leagues/${leagueId}/settings`);
  return data;
};

export const updateLeagueSettings = async (
  leagueId: string,
  settings: LeagueSettings
): Promise<void> => {
  await apiClient.put(`/v1/leagues/${leagueId}/settings`, settings);
};

// ── Coins ─────────────────────────────────────────────────────────────────────

export interface CoinBalanceResponse {
  coins: number;
}

export const getMyCoinBalance = async (leagueId: string): Promise<CoinBalanceResponse> => {
  const { data } = await apiClient.get<CoinBalanceResponse>(`/v1/leagues/${leagueId}/my-coins`);
  return data;
};

// ── Schedule ──────────────────────────────────────────────────────────────────

export interface MatchDto {
  id: string;
  player1: string;
  player2: string;
  winnerUsername?: string;
  status: 'PENDING' | 'COMPLETED';
}

export interface JornadaDto {
  roundNumber: number;
  matches: MatchDto[];
}

export interface ScheduleResponse {
  leagueId: string;
  jornadas: JornadaDto[];
}

export const getSchedule = async (leagueId: string): Promise<ScheduleResponse | null> => {
  const { data, status } = await apiClient.get<ScheduleResponse>(`/v1/leagues/${leagueId}/schedule`, {
    validateStatus: (s) => s === 200 || s === 204,
  });
  if (status === 204) return null;
  return data;
};

export const recordMatchResult = async (
  leagueId: string,
  matchId: string,
  winnerUsername: string
): Promise<void> => {
  await apiClient.post(`/v1/leagues/${leagueId}/schedule/matches/${matchId}/result`, { winnerUsername });
};
