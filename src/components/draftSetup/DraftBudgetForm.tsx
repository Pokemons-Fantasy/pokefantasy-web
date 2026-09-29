import type { SetupForm } from '../../utils/draftSetup';
import type { Tier } from '../../api/pokemons';
import TierNumberRow from '../TierNumberRow';

interface DraftBudgetFormProps {
  form: SetupForm;
  onChange: (patch: Partial<SetupForm>) => void;
  disabled?: boolean;
}

const PRICE_KEY = { S: 'priceS', A: 'priceA', B: 'priceB', C: 'priceC', D: 'priceD' } as const satisfies Record<Tier, keyof SetupForm>;

/** Presupuesto por jugador, precio de cada tier y modo snake de la preparación del draft. */
export default function DraftBudgetForm({ form, onChange, disabled }: DraftBudgetFormProps) {
  return (
    <div className="draft-budget-form">
      <div className="config-field">
        <label className="config-label" htmlFor="draft-budget">Presupuesto por jugador</label>
        <span className="config-number">
          <input
            id="draft-budget" className="search-input" type="number" inputMode="numeric" min={1} step={1}
            value={form.budget} disabled={disabled}
            onChange={(e) => onChange({ budget: Number(e.target.value) })}
          />
          <span className="field-unit">monedas</span>
        </span>
      </div>
      <div className="config-field">
        <span className="config-label">Precio de cada pick por tier</span>
        <TierNumberRow
          values={{ S: form.priceS, A: form.priceA, B: form.priceB, C: form.priceC, D: form.priceD }}
          onChange={(tier, value) => onChange({ [PRICE_KEY[tier]]: value })}
          labelFor={(tier) => `Precio del tier ${tier}`}
          disabled={disabled}
        />
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
