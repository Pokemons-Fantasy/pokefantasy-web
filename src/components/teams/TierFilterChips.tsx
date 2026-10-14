import type { Tier } from '../../api/pokemons';
import { TIER_ORDER } from '../../utils/tiers';

interface TierFilterChipsProps {
  selected: Set<Tier>;
  onToggle: (tier: Tier) => void;
  /** Botón "✕ Limpiar": solo se pinta si se pasa. */
  onClear?: () => void;
  /** Cuántos Pokémon hay de cada tier, para mostrarlo en el chip. */
  counts?: Partial<Record<Tier, number>>;
}

/** Chips S/A/B/C/D de selección múltiple para filtrar por tier. */
export default function TierFilterChips({ selected, onToggle, onClear, counts }: TierFilterChipsProps) {
  return (
    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
      <span style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginRight: '0.1rem' }}>
        Tier:
      </span>
      {TIER_ORDER.map((tier) => (
        <button
          key={tier}
          className={`gen-tab${selected.has(tier) ? ' active' : ''}`}
          aria-pressed={selected.has(tier)}
          onClick={() => onToggle(tier)}
        >
          {tier}
          {counts && <span style={{ opacity: 0.7, marginLeft: '0.3rem' }}>{counts[tier] ?? 0}</span>}
        </button>
      ))}
      {onClear && (
        <button
          className="gen-tab"
          style={{ color: 'var(--danger)', borderColor: 'var(--danger-border)' }}
          onClick={onClear}
        >
          ✕ Limpiar
        </button>
      )}
    </div>
  );
}
