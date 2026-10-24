import type { LeagueSettings } from '../api/leagues';

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

/** Comando para pegar en el chat de Showdown y retar al rival con el formato de la liga. */
export function challengeCommand(rivalShowdownName: string, settings: BattleSettings): string {
  return `/challenge ${rivalShowdownName}, ${showdownFormat(settings)}`;
}

/** Equipo en el formato de texto de Showdown ("Import from text"): solo las especies, un bloque por Pokémon. */
export function showdownTeamText(pokemonNames: string[]): string {
  return pokemonNames
    .map((name) => name.split('-').map((w) => w[0].toUpperCase() + w.slice(1)).join('-'))
    .join('\n\n');
}
