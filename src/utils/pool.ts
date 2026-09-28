import type { AvailablePokemon, ClosedListEntry } from '../api/pokemons';

export type GenFilter = 'all' | 'gen1' | 'gen2' | 'gen3' | 'gen4' | 'gen5' | 'gen6' | 'gen7' | 'gen8' | 'gen9' | 'regional';

export const GEN_TABS: { label: string; key: GenFilter; min?: number; max?: number }[] = [
  { label: 'Todos', key: 'all' },
  { label: 'Gen I', key: 'gen1', min: 1, max: 151 },
  { label: 'Gen II', key: 'gen2', min: 152, max: 251 },
  { label: 'Gen III', key: 'gen3', min: 252, max: 386 },
  { label: 'Gen IV', key: 'gen4', min: 387, max: 493 },
  { label: 'Gen V', key: 'gen5', min: 494, max: 649 },
  { label: 'Gen VI', key: 'gen6', min: 650, max: 721 },
  { label: 'Gen VII', key: 'gen7', min: 722, max: 809 },
  { label: 'Gen VIII', key: 'gen8', min: 810, max: 905 },
  { label: 'Gen IX', key: 'gen9', min: 906, max: 1025 },
  { label: 'Regional', key: 'regional' },
];

/** Los 18 tipos, en el orden de los juegos (claves en inglés, como PokeAPI). */
export const POKEMON_TYPES = [
  'normal', 'fire', 'water', 'grass', 'electric', 'ice', 'fighting', 'poison', 'ground',
  'flying', 'psychic', 'bug', 'rock', 'ghost', 'dragon', 'dark', 'steel', 'fairy',
];

export function matchesGen(p: Pick<AvailablePokemon, 'id' | 'name'>, gen: GenFilter): boolean {
  if (gen === 'all') return true;
  if (gen === 'regional') {
    const name = p.name.toLowerCase();
    return name.includes('-alola') || name.includes('-galar') || name.includes('-hisui') || name.includes('-paldea');
  }
  const tab = GEN_TABS.find((t) => t.key === gen);
  if (!tab || tab.min === undefined || tab.max === undefined) return false;
  return p.id >= tab.min && p.id <= tab.max && p.id < 10000;
}

/** Tipos de la lista de disponibles; con un backend sin tipos, los del pool (solo los nominados los tienen). */
export function pokemonTypes(p: Pick<AvailablePokemon, 'types'>, entry: Pick<ClosedListEntry, 'types'> | undefined): string[] {
  return p.types ?? entry?.types ?? [];
}

export function matchesType(types: string[], type: string): boolean {
  return type === 'all' || types.includes(type);
}

/** Estado de una card del Pool. El backend valida igualmente al nominar (misma regla de límite y fase). */
export type CardState = 'free' | 'own' | 'own-closed' | 'taken' | 'full' | 'closed';

export function cardState(s: {
  isNominated: boolean;
  isOwn: boolean;
  nominationsClosed: boolean;
  canNominate: boolean;
}): CardState {
  if (s.isOwn) return s.nominationsClosed ? 'own-closed' : 'own';
  if (s.isNominated) return 'taken';
  if (s.nominationsClosed) return 'closed';
  return s.canNominate ? 'free' : 'full';
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function cardLabel(state: CardState, name: string, nominatedBy?: string): string {
  const n = capitalize(name);
  switch (state) {
    case 'free': return `Nominar ${n}`;
    case 'own': return `Quitar ${n} de tus nominaciones`;
    case 'own-closed': return `${n}, nominado por ti`;
    case 'taken': return nominatedBy ? `${n}, nominado por ${nominatedBy}` : `${n}, ya nominado`;
    case 'full': return `${n}, ya tienes el máximo de nominaciones`;
    case 'closed': return `${n}, nominaciones cerradas`;
  }
}

/** Si la card responde al pulsarla: nominar (libre) o quitar (tuya con las nominaciones abiertas). */
export function isActionable(state: CardState): boolean {
  return state === 'free' || state === 'own';
}
