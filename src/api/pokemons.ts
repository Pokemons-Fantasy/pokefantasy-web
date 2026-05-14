import { apiClient } from './client';

export interface Pokemon {
  name: string;
  id: number;
}

export const getPokemons = async (): Promise<Pokemon[]> => {
  const { data } = await apiClient.get<Pokemon[]>('/v1/pokemons');
  return data;
};
