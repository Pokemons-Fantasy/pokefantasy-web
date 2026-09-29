import type { Tier } from '../api/pokemons';
import { TIER_ORDER } from '../utils/tiers';
import type { TierValues } from '../utils/leagueConfig';

interface TierNumberRowProps {
  values: TierValues;
  onChange: (tier: Tier, value: number) => void;
  /** Nombre accesible de cada input: el badge del tier es solo visual. */
  labelFor: (tier: Tier) => string;
  unit?: string;
  min?: number;
  max?: number;
  disabled?: boolean;
}

/** Cinco inputs numéricos en una fila, uno por tier (precios, porcentajes). */
export default function TierNumberRow({ values, onChange, labelFor, unit, min = 0, max, disabled }: TierNumberRowProps) {
  return (
    <div className="tier-row">
      {TIER_ORDER.map((tier) => (
        <label key={tier} className="tier-row-field">
          <span className={`tier-badge tier-badge-${tier.toLowerCase()} tier-row-badge`} aria-hidden="true">{tier}</span>
          <span className="tier-row-input">
            <input
              className="search-input"
              type="number"
              inputMode="numeric"
              min={min}
              max={max}
              step={1}
              value={values[tier]}
              disabled={disabled}
              aria-label={labelFor(tier)}
              onChange={(e) => onChange(tier, Number(e.target.value))}
            />
            {unit && <span className="field-unit" aria-hidden="true">{unit}</span>}
          </span>
        </label>
      ))}
    </div>
  );
}
