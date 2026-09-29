import type { LeagueDraftStatus } from '../api/leagues';

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

