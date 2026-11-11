import type { LeaguePhase } from './leaguePhase';

/** Destino relativo a `/leagues/:leagueId` y su texto. */
export interface LeagueNavItem {
  path: string;
  label: string;
}

const MEMBERS: LeagueNavItem = { path: 'members', label: 'Miembros' };
const POOL: LeagueNavItem = { path: 'pool', label: 'Pool' };
const DRAFT: LeagueNavItem = { path: 'draft', label: 'Draft' };
const TEAMS: LeagueNavItem = { path: 'teams', label: 'Equipos' };
const SCHEDULE: LeagueNavItem = { path: 'schedule', label: 'Calendario' };
const STANDINGS: LeagueNavItem = { path: 'standings', label: 'Clasificación' };
const ACTIVITY: LeagueNavItem = { path: 'activity', label: 'Actividad' };
const CONFIG: LeagueNavItem = { path: 'config', label: 'Configuración' };
const TIERS: LeagueNavItem = { path: 'tiers', label: 'Gestionar tiers' };

/** Pestañas de la liga según su fase: primero lo que más se usa en cada momento. */
export function leagueTabs(phase: LeaguePhase): LeagueNavItem[] {
  switch (phase) {
    case 'preparing':
    case 'draft': return [DRAFT, POOL, MEMBERS];
    case 'season': return [TEAMS, SCHEDULE, STANDINGS, ACTIVITY, DRAFT];
    default: return [MEMBERS, POOL, DRAFT];
  }
}

/** Entradas del menú de engranaje. Gestionar tiers exige draft completado (regla de TierManagementPage). */
export function leagueMenu(phase: LeaguePhase, isAdmin: boolean): LeagueNavItem[] {
  if (phase !== 'season') return [CONFIG];
  return isAdmin ? [CONFIG, TIERS, MEMBERS] : [CONFIG, MEMBERS];
}

export function firstTab(phase: LeaguePhase): string {
  return leagueTabs(phase)[0].path;
}

/** Sección que se marca como activa para una subruta (`players/ash` cuelga de Clasificación). */
export function activeSection(subpath: string): string {
  const first = subpath.split('/')[0];
  return first === 'players' ? STANDINGS.path : first;
}

/** Navegación de la liga en móvil: pestañas de la barra inferior y lo que va en "Más" (el botón lo pone el shell). */
export interface MobileNav {
  bar: LeagueNavItem[];
  more: LeagueNavItem[];
}

export function mobileNav(phase: LeaguePhase, isAdmin: boolean): MobileNav {
  if (phase === 'season') {
    return {
      bar: leagueTabs(phase).filter((tab) => tab !== DRAFT),
      more: [DRAFT, ...leagueMenu(phase, isAdmin)],
    };
  }
  return { bar: leagueTabs(phase), more: leagueMenu(phase, isAdmin) };
}
