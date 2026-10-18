import { apiClient } from './client';

/** Panel de moderación (L5). El backend solo lo permite al rol global ADMIN. */
export interface AdminUser {
  username: string;
  avatarVersion?: number | null;
  admin: boolean;
}

export interface AdminLeague {
  id: string;
  name: string;
  members: number;
}

export const searchUsers = async (q: string): Promise<AdminUser[]> => {
  const { data } = await apiClient.get<AdminUser[]>('/v1/admin/users', { params: { q } });
  return data;
};

export const searchLeagues = async (q: string): Promise<AdminLeague[]> => {
  const { data } = await apiClient.get<AdminLeague[]>('/v1/admin/leagues', { params: { q } });
  return data;
};

export const removeAvatar = async (username: string): Promise<void> => {
  await apiClient.delete(`/v1/admin/users/${encodeURIComponent(username)}/avatar`);
};

export const renameLeague = async (leagueId: string, name: string): Promise<void> => {
  await apiClient.put(`/v1/admin/leagues/${encodeURIComponent(leagueId)}/name`, { name });
};

export const deleteUser = async (username: string): Promise<void> => {
  await apiClient.delete(`/v1/admin/users/${encodeURIComponent(username)}`);
};
