import { apiClient, API_BASE_URL } from './client';

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

/** Cambia la contraseña. El backend cierra las demás sesiones y renueva las cookies de esta. */
export const changePassword = async (currentPassword: string, newPassword: string): Promise<void> => {
  await apiClient.put('/v1/user/password', { currentPassword, newPassword });
};

export interface CurrentUser {
  username: string;
  /** Versión de la foto de perfil; null o ausente = sin foto. */
  avatarVersion?: number | null;
}

export interface AvatarVersionResponse {
  avatarVersion: number;
}

export const getMe = async (): Promise<CurrentUser> => {
  const { data } = await apiClient.get<CurrentUser>('/v1/user/me');
  return data;
};

/** Sube la foto ya recortada (JPEG) y devuelve su versión nueva. Sustituye a la anterior. */
export const uploadAvatar = async (image: Blob): Promise<number> => {
  const form = new FormData();
  form.append('file', image, 'avatar.jpg');
  // El cliente manda JSON por defecto, y con ese Content-Type Axios convertiría el FormData a JSON.
  // Con multipart, el navegador pone el boundary.
  const { data } = await apiClient.put<AvatarVersionResponse>('/v1/user/avatar', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data.avatarVersion;
};

export const deleteAvatar = async (): Promise<void> => {
  await apiClient.delete('/v1/user/avatar');
};

/** URL de la foto de un usuario. La versión va en la URL: cada foto se cachea como inmutable. */
export const avatarUrl = (username: string, version: number): string =>
  `${API_BASE_URL}/v1/users/${encodeURIComponent(username)}/avatar?v=${version}`;
