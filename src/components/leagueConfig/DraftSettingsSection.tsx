import type { SectionProps } from './types';
import NumberField from './NumberField';
import TierNumberRow from '../TierNumberRow';
import { TIER_ORDER } from '../../utils/tiers';
import { fixTierSum, PCT_KEY, tierCountsPreview, tierValues } from '../../utils/leagueConfig';

interface DraftSettingsSectionProps extends SectionProps {
  tierSum: number;
  tierSumOk: boolean;
  /** Pokémon del pool, solo antes de preparar el draft (después el reparto real está en Preparar draft). */
  poolSize?: number;
}

/** Reparto inicial de tiers, tamaño de equipo (= rondas del draft) y tiempo por turno. */
export default function DraftSettingsSection({ form, setField, disabled, tierSum, tierSumOk, poolSize }: DraftSettingsSectionProps) {
  const pcts = tierValues(form, PCT_KEY);
  const fixed = fixTierSum(pcts);
  const counts = poolSize ? tierCountsPreview(poolSize, pcts) : null;
  const missing = 100 - tierSum;

  return (
    <section className="config-section" aria-labelledby="config-draft">
      <h2 id="config-draft" className="config-section-title">Draft</h2>

      <div className="config-field">
        <span className="config-label">Distribución de tiers</span>
        <span className="config-hint">
          Porcentaje del pool (ordenado por BST) que va a cada tier. Es el punto de partida al preparar el draft;
          después los tiers se ajustan a mano en Preparar draft.
        </span>
        <TierNumberRow
          values={pcts}
          onChange={(tier, v) => setField(PCT_KEY[tier], v)}
          labelFor={(tier) => `Porcentaje del tier ${tier}`}
          unit="%"
          max={100}
          disabled={disabled}
        />

        <div className="tier-dist-bar" aria-hidden="true">
          {TIER_ORDER.map((tier) => pcts[tier] > 0 && (
            <span
              key={tier}
              className={`tier-dist-segment tier-dist-${tier.toLowerCase()}`}
              style={{ flexGrow: pcts[tier] }}
            >
              {pcts[tier] >= 8 ? tier : ''}
            </span>
          ))}
          {tierSum < 100 && <span className="tier-dist-segment tier-dist-missing" style={{ flexGrow: missing }} />}
        </div>

        <div className="tier-dist-status" role="status">
          <span className={tierSumOk ? 'tier-dist-ok' : 'tier-dist-bad'}>
            {tierSumOk ? `Suma: 100 % ✓` : `Suma: ${tierSum} % (${missing > 0 ? `faltan ${missing}` : `sobran ${-missing}`})`}
          </span>
          {fixed && !disabled && (
            <button
              type="button"
              className="btn-ghost tier-dist-fix"
              onClick={() => TIER_ORDER.forEach((tier) => setField(PCT_KEY[tier], fixed[tier]))}
            >
              Ajustar para sumar 100
            </button>
          )}
        </div>

        {counts && tierSumOk && (
          <span className="config-hint">
            Con los {poolSize} Pokémon del pool: {TIER_ORDER.map((t) => `${t} ${counts[t]}`).join(' · ')}
          </span>
        )}
      </div>

      <div className="config-grid-2">
        <NumberField
          id="maxTeamSize" label="Tamaño máximo del equipo" unit="Pokémon" min={10} value={form.maxTeamSize ?? 20}
          onChange={(v) => setField('maxTeamSize', v)} disabled={disabled}
          hint="Máximo de Pokémon por equipo y número de rondas del draft (mínimo 10)."
        />
        <NumberField
          id="turnTimerSeconds" label="Tiempo por turno" unit="s" value={form.turnTimerSeconds ?? 0}
          onChange={(v) => setField('turnTimerSeconds', v)} disabled={disabled}
          hint="Si el jugador en turno no elige a tiempo, se le asigna uno aleatorio que pueda pagar. 0 = sin límite."
        />
      </div>
    </section>
  );
}
