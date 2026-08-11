import type { SectionProps } from './types';

const TIERS = ['S', 'A', 'B', 'C', 'D'] as const;

interface TierDistributionSectionProps extends SectionProps {
  tierSum: number;
  tierSumOk: boolean;
}

export default function TierDistributionSection({ form, setField, disabled, tierSum, tierSumOk }: TierDistributionSectionProps) {
  return (
    <>
      <hr className="divider" style={{ margin: '1.5rem 0 1rem' }} />
      <p className="section-label" style={{ marginBottom: '0.35rem' }}>Distribución de tiers al inicio del draft</p>
      <span className="config-hint" style={{ marginBottom: '1rem', display: 'block' }}>
        Porcentaje del pool que se asigna a cada tier. La suma debe ser exactamente 100%.
        Se aplica cuando se inicia el draft.
      </span>

      {TIERS.map((tier) => {
        const key = `tierPct${tier}` as const;
        return (
          <div key={`pct-${tier}`} className="config-field" style={{ flexDirection: 'row', alignItems: 'center', gap: '0.75rem' }}>
            <span className={`tier-badge tier-badge-${tier.toLowerCase()}`} style={{ position: 'static', width: 28, height: 28, fontSize: '0.75rem', flexShrink: 0 }}>
              {tier}
            </span>
            <input
              className="search-input"
              type="number"
              min={0}
              max={100}
              step={1}
              value={form[key]}
              onChange={(e) => setField(key, Number(e.target.value))}
              disabled={disabled}
              style={{ flex: 1 }}
            />
            <span style={{ color: 'var(--text-3)', fontSize: '0.85rem', minWidth: 20 }}>%</span>
          </div>
        );
      })}

      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        marginTop: '0.5rem',
        marginBottom: '0.25rem',
        fontSize: '0.85rem',
        fontWeight: 600,
        color: tierSumOk ? 'var(--green)' : 'var(--red)',
      }}>
        {tierSumOk ? '✓' : '✗'} Suma: {tierSum}% {tierSumOk ? '— correcto' : '(debe ser 100%)'}
      </div>
    </>
  );
}
