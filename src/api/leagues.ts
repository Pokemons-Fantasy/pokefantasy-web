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
  seasonStartDate?: string; // ISO "YYYY-MM-DD"
  maxTeamSize?: number;     // default 20
  tierPctS: number;         // % of pool → S tier (default 20)
  tierPctA: number;         // % of pool → A tier (default 20)
  tierPctB: number;         // % of pool → B tier (default 20)
  tierPctC: number;         // % of pool → C tier (default 20)
  tierPctD: number;         // % of pool → D tier (default 20)
  turnTimerSeconds?: number; // seconds per turn; 0 = disabled
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
  startDate?: string;       // "YYYY-MM-DD"
  stealDeadline?: string;   // ISO datetime "YYYY-MM-DDTHH:mm:ss"
  swapDeadline?: string;    // ISO datetime "YYYY-MM-DDTHH:mm:ss"
}

export interface ScheduleResponse {
  leagueId: string;
  jornadas: JornadaDto[];
  /** Estado de las ventanas calculado por el backend (única fuente de verdad). */
  stealWindowOpen: boolean;
  swapWindowOpen: boolean;
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

export interface PlayerStanding {
  username: string;
  played: number;
  wins: number;
  losses: number;
  coins: number;
}

export const getStandings = async (leagueId: string): Promise<PlayerStanding[]> => {
  const { data } = await apiClient.get<{ standings: PlayerStanding[] }>(`/v1/leagues/${leagueId}/standings`);
  return data.standings;
};
