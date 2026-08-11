import type { SectionProps } from './types';

const TIERS = ['S', 'A', 'B', 'C', 'D'] as const;

export default function TierPricesSection({ form, setField, disabled }: SectionProps) {
  return (
    <>
      <hr className="divider" style={{ margin: '1.5rem 0 1rem' }} />
      <p className="section-label" style={{ marginBottom: '1rem' }}>Precio por tier (monedas)</p>
      <span className="config-hint" style={{ marginBottom: '1rem', display: 'block' }}>
        Coste en monedas de elegir un Pokémon de cada categoría.
      </span>

      {TIERS.map((tier) => {
        const key = `priceTier${tier}` as const;
        return (
          <div key={tier} className="config-field" style={{ flexDirection: 'row', alignItems: 'center', gap: '0.75rem' }}>
            <span className={`tier-badge tier-badge-${tier.toLowerCase()}`} style={{ position: 'static', width: 28, height: 28, fontSize: '0.75rem', flexShrink: 0 }}>
              {tier}
            </span>
            <input
              className="search-input"
              type="number"
              min={0}
              step={1}
              value={form[key]}
              onChange={(e) => setField(key, Number(e.target.value))}
              disabled={disabled}
              style={{ flex: 1 }}
            />
          </div>
        );
      })}
    </>
  );
}
