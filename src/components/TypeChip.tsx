import type { CSSProperties } from 'react';
import { TYPE_COLORS } from '../utils/colors';
import { typeLabel } from '../utils/pokemonTypes';

/** Chip de un tipo de Pokémon: nombre en español sobre el color del tipo (el texto usa el color normal). */
export default function TypeChip({ type }: { type: string }) {
  const color = TYPE_COLORS[type.toLowerCase()];
  const style = color ? ({ '--type-color': color.color, '--type-bg': color.bg } as CSSProperties) : undefined;
  return <span className="type-chip" style={style}>{typeLabel(type)}</span>;
}
