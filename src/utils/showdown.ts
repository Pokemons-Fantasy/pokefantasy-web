import type { BattleGameType, LeagueSettings, TeamSheet } from '../api/leagues';

export const GAME_TYPE_LABELS: Record<BattleGameType, string> = {
  DOUBLES: 'Dobles',
  SINGLES: 'Individual',
};

/** Nombre del formato en el selector del Teambuilder de Showdown. */
export const SHOWDOWN_FORMAT_NAMES: Record<BattleGameType, string> = {
  DOUBLES: 'Doubles Custom Game',
  SINGLES: 'Custom Game',
};

export const TEAM_SHEET_LABELS: Record<TeamSheet, string> = {
  CLOSED: 'Cerrada (el rival solo ve los Pokémon)',
  OPEN: 'Abierta (el rival ve el equipo completo)',
};

export const BEST_OF_LABELS: Record<number, string> = {
  3: 'Al mejor de 3',
  1: 'Una partida',
};

export function pickedTeamSizeLabel(size: number): string {
  return size >= 6 ? 'Todos (6)' : String(size);
}

/** Ajustes de combate por defecto: los mismos que aplica el backend cuando la liga no los tiene. */
export const BATTLE_DEFAULTS = {
  battleGameType: 'DOUBLES',
  pickedTeamSize: 4,
  teamSheet: 'CLOSED',
  bestOf: 3,
} as const satisfies Pick<Required<LeagueSettings>, 'battleGameType' | 'pickedTeamSize' | 'teamSheet' | 'bestOf'>;

export const SHOWDOWN_PLAY_URL = 'https://play.pokemonshowdown.com/';

type BattleSettings = Partial<Pick<LeagueSettings, 'battleGameType' | 'pickedTeamSize' | 'bestOf'>>;

/**
 * Formato de Showdown con las reglas de la liga: custom game (individual o dobles) y, si hace falta,
 * `Picked Team Size` (se llevan 6 y se eligen N en el Team Preview) y `Best Of = 3`.
 */
export function showdownFormat(settings: BattleSettings): string {
  const gameType = settings.battleGameType ?? BATTLE_DEFAULTS.battleGameType;
  const picked = settings.pickedTeamSize ?? BATTLE_DEFAULTS.pickedTeamSize;
  const bestOf = settings.bestOf ?? BATTLE_DEFAULTS.bestOf;
  const rules: string[] = [];
  if (picked < 6) rules.push(`Picked Team Size = ${picked}`);
  if (bestOf === 3) rules.push('Best Of = 3');
  const format = gameType === 'SINGLES' ? 'gen9customgame' : 'gen9doublescustomgame';
  return rules.length ? `${format}@@@${rules.join(', ')}` : format;
}

/** Reto para pegar en una sala de Showdown (el Lobby): con el nombre del rival y el formato de la liga. */
export function challengeCommand(rivalShowdownName: string, settings: BattleSettings): string {
  return `/challenge ${rivalShowdownName}, ${showdownFormat(settings)}`;
}

/**
 * Reto para pegar en el chat privado con el rival: ahí Showdown reta a quien tienes en el privado y todo lo que
 * sigue a `/challenge` es el formato, así que con el nombre delante saldría «Unrecognized format».
 */
export function dmChallengeCommand(settings: BattleSettings): string {
  return `/challenge ${showdownFormat(settings)}`;
}

/** Equipo en el formato de texto de Showdown ("Import from text"): solo las especies, un bloque por Pokémon. */
export function showdownTeamText(pokemonNames: string[]): string {
  return pokemonNames
    .map((name) => name.split('-').map((w) => w[0].toUpperCase() + w.slice(1)).join('-'))
    .join('\n\n');
}
