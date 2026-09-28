import type { ActivityEvent } from '../../api/activity';
import { describeEvent, eventCategory, eventPokemon } from '../../utils/activity';
import { formatTime } from '../../utils/dates';

const ICON: Record<ActivityEvent['type'], string> = {
  STEAL: '⚡',
  TRADE_COMPLETED: '🤝',
  BENCH_SWAP: '↔',
  BENCH_PURCHASE: '🛒',
  POKEMON_RELEASED: '🕊️',
  MATCH_RESULT: '🏆',
  MATCH_RESULT_REVERTED: '↩',
  TIER_CHANGE: '◈',
  COIN_EARNED: '●',
  COIN_REVOKED: '●',
};

interface ActivityRowProps {
  event: ActivityEvent;
  /** Sprite por nombre de Pokémon (del pool de la liga); sin sprite, no se pinta imagen. */
  spriteByName: Map<string, string>;
}

/** Una fila del feed: icono del tipo, sprites, texto con los nombres resaltados y hora. */
export default function ActivityRow({ event, spriteByName }: ActivityRowProps) {
  const sprites = eventPokemon(event)
    .map((name) => spriteByName.get(name))
    .filter((src): src is string => !!src);

  return (
    <li className={`activity-row cat-${eventCategory(event.type)}`}>
      <span className="activity-icon" aria-hidden="true">{ICON[event.type] ?? '?'}</span>
      {sprites.length > 0 && (
        <span className="activity-sprites" aria-hidden="true">
          {sprites.map((src) => <img key={src} src={src} alt="" loading="lazy" />)}
        </span>
      )}
      <p className="activity-text">
        {describeEvent(event).map((part, i) =>
          part.kind ? <strong key={i} className={`activity-${part.kind}`}>{part.text}</strong> : part.text,
        )}
      </p>
      <time className="activity-time" dateTime={event.createdAt}>{formatTime(new Date(event.createdAt))}</time>
    </li>
  );
}
