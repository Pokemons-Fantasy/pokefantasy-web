import { Activity, CalendarDays, LayoutGrid, ListOrdered, Trophy, UserRound, Users } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

/** Icono de cada sección de la liga en la barra inferior (claves = `path` de utils/leagueNav). */
export const navIcons: Record<string, LucideIcon> = {
  teams: Users,
  schedule: CalendarDays,
  standings: Trophy,
  activity: Activity,
  draft: ListOrdered,
  pool: LayoutGrid,
  members: UserRound,
};
