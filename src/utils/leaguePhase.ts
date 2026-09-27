import type { League, LeagueDraftStatus } from '../api/leagues';

/** Fase de una liga derivada del draft vigente (el backend la expone como draftStatus). */
export type LeaguePhase = 'setup' | 'draft' | 'season' | 'cancelled';

export function leaguePhase(draftStatus: LeagueDraftStatus | undefined): LeaguePhase {
  switch (draftStatus) {
    case 'IN_PROGRESS': return 'draft';
    case 'COMPLETED': return 'season';
    case 'CANCELLED': return 'cancelled';
    default: return 'setup';
  }
}

/** Etiqueta y variante de `.badge-*` de cada fase: una sola forma de mostrar el estado en toda la app. */
export const LEAGUE_PHASES: Record<LeaguePhase, { label: string; badge: 'gray' | 'green' | 'info' }> = {
  setup: { label: 'En preparación', badge: 'gray' },
  draft: { label: 'Draft en curso', badge: 'green' },
  season: { label: 'Temporada', badge: 'info' },
  cancelled: { label: 'Draft cancelado', badge: 'gray' },
};

/**
 * Qué destacar en la home: un draft en curso manda sobre el setup pendiente, y este sobre
 * la temporada. Devuelve las ligas de esa fase (nunca vacío si hay alguna liga).
 */
export function homeFocus(leagues: League[]): { phase: 'draft' | 'setup' | 'season'; leagues: League[] } | null {
  const byPhase = (...phases: LeaguePhase[]) =>
    leagues.filter((l) => phases.includes(leaguePhase(l.draftStatus)));
  const drafting = byPhase('draft');
  if (drafting.length > 0) return { phase: 'draft', leagues: drafting };
  const settingUp = byPhase('setup', 'cancelled');
  if (settingUp.length > 0) return { phase: 'setup', leagues: settingUp };
  const inSeason = byPhase('season');
  return inSeason.length > 0 ? { phase: 'season', leagues: inSeason } : null;
}
