import { apiClient } from './client';

export const login = async (username: string, password: string): Promise<string> => {
  const { data } = await apiClient.post<string>('/v1/user/login', { username, password });
  return data;
};

export const register = async (username: string, password: string): Promise<void> => {
  await apiClient.post('/v1/user', { username, password });
};
