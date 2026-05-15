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
