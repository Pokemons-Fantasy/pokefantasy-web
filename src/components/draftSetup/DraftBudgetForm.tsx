import type { SetupForm } from '../../utils/draftSetup';
import { TIER_ORDER } from '../../utils/tiers';

interface DraftBudgetFormProps {
  form: SetupForm;
  onChange: (patch: Partial<SetupForm>) => void;
  disabled?: boolean;
}

const PRICE_KEY = { S: 'priceS', A: 'priceA', B: 'priceB', C: 'priceC', D: 'priceD' } as const;

/** Presupuesto por jugador, precio de cada tier y modo snake de la preparación del draft. */
export default function DraftBudgetForm({ form, onChange, disabled }: DraftBudgetFormProps) {
  return (
    <div className="draft-budget-form">
      <label className="config-field">
        <span>Presupuesto por jugador</span>
        <input
          className="search-input" type="number" min={1} step={1} value={form.budget} disabled={disabled}
          onChange={(e) => onChange({ budget: Number(e.target.value) })}
        />
      </label>
      <div className="draft-price-row">
        {TIER_ORDER.map((tier) => (
          <label key={tier} className="draft-price-field">
            <span className={`tier-badge tier-badge-${tier.toLowerCase()}`} style={{ position: 'static' }}>{tier}</span>
            <input
              className="search-input" type="number" min={0} step={1} value={form[PRICE_KEY[tier]]} disabled={disabled}
              aria-label={`Precio del tier ${tier}`}
              onChange={(e) => onChange({ [PRICE_KEY[tier]]: Number(e.target.value) })}
            />
          </label>
        ))}
      </div>
      <label className="draft-snake-toggle">
        <input
          type="checkbox" checked={form.snake} disabled={disabled}
          onChange={(e) => onChange({ snake: e.target.checked })}
        />
        <span>Snake: el orden se invierte en cada ronda</span>
      </label>
    </div>
  );
}
