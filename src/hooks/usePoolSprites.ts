import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getClosedList } from '../api/pokemons';
import { spriteUrl } from '../utils/sprites';

/**
 * Nombre del Pokémon → URL de su sprite, a partir del pool de la liga (misma caché que Pool y Equipos).
 * Sirve para lo que guarda nombres de Pokémon que pueden no estar ya en ningún equipo (actividad, alineaciones
 * de jornadas jugadas). `picks` completa lo que el pool no tiene (ligas sin lista cerrada).
 */
export function usePoolSprites(
  leagueId: string | undefined,
  picks?: readonly { pokemonName: string; pokemonId: number }[],
): Map<string, string> {
  const { data: pool } = useQuery({
    queryKey: ['closed-list', leagueId],
    queryFn: () => getClosedList(leagueId!),
    enabled: !!leagueId,
    staleTime: 5 * 60_000,
  });
  return useMemo(() => new Map([
    ...(pool ?? []).map((e) => [e.pokemonName, spriteUrl(e.pokemonId)] as const),
    ...(picks ?? []).map((p) => [p.pokemonName, spriteUrl(p.pokemonId)] as const),
  ]), [pool, picks]);
}
