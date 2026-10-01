import type { ActivityEvent } from '../api/activity';
import { CLAUSE_RAISE_MULTIPLIER } from './clause';
import { coinsLabel } from './coins';
import { formatDayLabel } from './dates';

export type ActivityType = ActivityEvent['type'];
export type ActivityCategory = 'steal' | 'trade' | 'bench' | 'match' | 'tier' | 'coins';

const CATEGORY: Record<ActivityType, ActivityCategory> = {
  STEAL: 'steal',
  CLAUSE_RAISED: 'steal',
  TRADE_COMPLETED: 'trade',
  BENCH_SWAP: 'bench',
  BENCH_PURCHASE: 'bench',
  POKEMON_RELEASED: 'bench',
  MATCH_RESULT: 'match',
  MATCH_RESULT_REVERTED: 'match',
  TIER_CHANGE: 'tier',
  COIN_EARNED: 'coins',
  COIN_REVOKED: 'coins',
  DRAFT_COINS: 'coins',
};

export function eventCategory(type: ActivityType): ActivityCategory {
  return CATEGORY[type] ?? 'coins';
}

const typesOf = (...categories: ActivityCategory[]) =>
  (Object.keys(CATEGORY) as ActivityType[]).filter((t) => categories.includes(CATEGORY[t]));

/**
 * Filtros del feed de liga. Los tipos se piden al backend (`types`), así que la paginación es de eventos
 * del filtro. Las monedas no salen en el feed de liga: cada partido genera dos y ya están en el perfil.
 */
export const ACTIVITY_FILTERS: { key: string; label: string; types: ActivityType[] }[] = [
  { key: 'all', label: 'Todo', types: typesOf('steal', 'trade', 'bench', 'match', 'tier') },
  { key: 'steal', label: 'Robos', types: typesOf('steal') },
  { key: 'trade', label: 'Intercambios', types: typesOf('trade') },
  { key: 'bench', label: 'Banquillo', types: typesOf('bench') },
  { key: 'match', label: 'Partidos', types: typesOf('match') },
  { key: 'tier', label: 'Tiers', types: typesOf('tier') },
];

/** Trozo del texto de un evento; `kind` marca los nombres que se resaltan. */
export interface EventPart {
  text: string;
  kind?: 'user' | 'pokemon';
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const user = (name?: string): EventPart => ({ text: name ?? '?', kind: 'user' });
const pokemon = (name?: string): EventPart => ({ text: name ? capitalize(name) : '?', kind: 'pokemon' });
const txt = (text: string): EventPart => ({ text });

export function describeEvent(e: ActivityEvent): EventPart[] {
  const coins = e.coinsAmount ?? 0;
  const round = e.roundNumber ?? '?';
  switch (e.type) {
    case 'STEAL':
      return [user(e.actorUsername), txt(' robó a '), pokemon(e.pokemonName), txt(' de '), user(e.targetUsername),
        txt(` · ${coinsLabel(coins)}`)];
    case 'CLAUSE_RAISED':
      return [user(e.actorUsername), txt(' subió la cláusula de '), pokemon(e.pokemonName),
        txt(` en ${coins * CLAUSE_RAISE_MULTIPLIER} · ${coinsLabel(coins)}`)];
    case 'TRADE_COMPLETED':
      return [user(e.actorUsername), txt(' cambió '), pokemon(e.pokemonName), txt(' a '), user(e.targetUsername),
        txt(' por '), pokemon(e.pokemonName2), ...(coins > 0 ? [txt(` · con ${coinsLabel(coins)}`)] : [])];
    case 'BENCH_SWAP':
      return [user(e.actorUsername), txt(' cambió '), pokemon(e.pokemonName), txt(' por '), pokemon(e.pokemonName2),
        txt(' del banquillo' + (coins > 0 ? ` · +${coinsLabel(coins)}` : coins < 0 ? ` · pagó ${coinsLabel(-coins)}` : ''))];
    case 'BENCH_PURCHASE':
      return [user(e.actorUsername), txt(' compró a '), pokemon(e.pokemonName), txt(` del banquillo · ${coinsLabel(coins)}`)];
    case 'POKEMON_RELEASED':
      return [user(e.actorUsername), txt(' liberó a '), pokemon(e.pokemonName), txt(` al banquillo · +${coinsLabel(coins)}`)];
    case 'MATCH_RESULT':
      return [user(e.actorUsername), txt(' ganó a '), user(e.targetUsername), txt(` · jornada ${round}`)];
    case 'MATCH_RESULT_REVERTED':
      return [txt('Se anuló el resultado '), user(e.actorUsername), txt(' – '), user(e.targetUsername),
        txt(` · jornada ${round}`)];
    case 'TIER_CHANGE':
      return [pokemon(e.pokemonName), txt(e.fromTier ? ` pasó del tier ${e.fromTier} al ${e.toTier}` : ` pasó al tier ${e.toTier}`)];
    case 'COIN_EARNED':
      return [user(e.actorUsername), txt(` ganó ${coinsLabel(coins)} · jornada ${round}`)];
    case 'COIN_REVOKED':
      return [user(e.actorUsername), txt(` devolvió ${coinsLabel(coins)} · jornada ${round}`)];
    case 'DRAFT_COINS':
      return [user(e.actorUsername), txt(` recibió ${coinsLabel(coins)} que le sobraron del draft`)];
    default:
      return [txt('Evento desconocido')];
  }
}

export function partsText(parts: EventPart[]): string {
  return parts.map((p) => p.text).join('');
}

/** Pokémon que aparecen en el evento (para los sprites). */
export function eventPokemon(e: ActivityEvent): string[] {
  return [e.pokemonName, e.pokemonName2].filter((n): n is string => !!n);
}

/** Eventos agrupados por día local, en el orden en que llegan (más reciente primero). */
export function groupByDay(events: ActivityEvent[], now: Date): { label: string; events: ActivityEvent[] }[] {
  const groups: { label: string; events: ActivityEvent[] }[] = [];
  for (const e of events) {
    const label = formatDayLabel(new Date(e.createdAt), now);
    const last = groups[groups.length - 1];
    if (last?.label === label) last.events.push(e);
    else groups.push({ label, events: [e] });
  }
  return groups;
}

/**
 * Id del primer evento que ya se vio en la visita anterior (`lastSeen`: fecha del evento más reciente de
 * entonces), para poner encima el separador "Desde tu última visita". Null si no hay nada nuevo, si todo
 * es nuevo o si es la primera visita.
 */
export function firstSeenEventId(events: ActivityEvent[], lastSeen: string | null): string | null {
  if (!lastSeen) return null;
  const seen = new Date(lastSeen).getTime();
  const index = events.findIndex((e) => new Date(e.createdAt).getTime() <= seen);
  return index > 0 ? events[index].id : null;
}
