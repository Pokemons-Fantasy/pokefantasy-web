import { apiClient } from './client';

export interface LoginResponse {
  username: string;
}

export const login = async (username: string, password: string): Promise<LoginResponse> => {
  const { data } = await apiClient.post<LoginResponse>('/v1/user/login', { username, password });
  return data;
};

export const register = async (username: string, password: string): Promise<void> => {
  await apiClient.post('/v1/user', { username, password });
};

export const logout = async (): Promise<void> => {
  await apiClient.post('/v1/user/logout');
};
