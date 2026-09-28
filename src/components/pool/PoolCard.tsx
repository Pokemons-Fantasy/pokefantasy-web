import type { Tier } from '../../api/pokemons';
import TierBadge from '../TierBadge';
import TypeChip from '../TypeChip';
import { spriteUrl } from '../../utils/sprites';
import { cardLabel, isActionable, type CardState } from '../../utils/pool';
import { typeLabel } from '../../utils/pokemonTypes';

interface PoolCardProps {
  id: number;
  name: string;
  types: string[];
  state: CardState;
  tier?: Tier | null;
  nominatedBy?: string;
  busy: boolean;
  onToggle: () => void;
  /** Solo en los nominados: abre la ficha con estadísticas. */
  onInfo?: () => void;
}

/**
 * Card del Pool. La zona principal es un botón (nominar / quitar); cuando no se puede, queda con
 * `aria-disabled` para que siga siendo enfocable y anuncie por qué. La ficha va en un botón aparte.
 */
export default function PoolCard({ id, name, types, state, tier, nominatedBy, busy, onToggle, onInfo }: PoolCardProps) {
  const label = cardLabel(state, name, nominatedBy);
  // Los chips son visuales: los tipos van también en el nombre accesible
  const accessibleName = types.length > 0 ? `${label} (${types.map(typeLabel).join(', ')})` : label;
  const actionable = isActionable(state) && !busy;
  const mine = state === 'own' || state === 'own-closed';
  const nominated = mine || state === 'taken';
  const owner = mine ? 'Tuyo' : state === 'taken' ? (nominatedBy ? `De ${nominatedBy}` : 'Nominado') : null;

  return (
    <div className={`pool-card state-${state}`}>
      <button
        type="button"
        className="pool-card-main"
        aria-label={accessibleName}
        title={label}
        aria-disabled={!actionable || undefined}
        onClick={() => actionable && onToggle()}
      >
        <span className="pool-sprite-box" aria-hidden="true">
          <img src={spriteUrl(id)} alt="" className="pool-sprite" loading="lazy" />
        </span>
        <span className="pool-name">{name}</span>
        {types.length > 0 && (
          <span className="pool-types" aria-hidden="true">
            {types.map((t) => <TypeChip key={t} type={t} />)}
          </span>
        )}
        {owner && <span className="pool-owner">{owner}</span>}
      </button>

      {nominated && <TierBadge tier={tier} />}
      {onInfo && (
        <button type="button" className="pool-info-btn" onClick={onInfo} aria-label={`Ver ficha de ${name}`} title="Ver ficha">
          i
        </button>
      )}
    </div>
  );
}
