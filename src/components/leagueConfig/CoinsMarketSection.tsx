import type { SectionProps } from './types';
import NumberField from './NumberField';
import TierNumberRow from '../TierNumberRow';
import Notice from '../Notice';
import { PRICE_KEY, tierValues, zeroPriceTiers } from '../../utils/leagueConfig';

/** Monedas por partido y precios de mercado por tier (temporada: robos, banquillo, liberar). */
export default function CoinsMarketSection({ form, setField, disabled }: SectionProps) {
  const zero = zeroPriceTiers(form);

  return (
    <section className="config-section" aria-labelledby="config-coins">
      <h2 id="config-coins" className="config-section-title">Monedas y mercado</h2>

      <div className="config-grid-2">
        <NumberField
          id="coinsPerWin" label="Monedas por victoria" unit="monedas" value={form.coinsPerWin}
          onChange={(v) => setField('coinsPerWin', v)} disabled={disabled}
          hint="Lo que gana un jugador al ganar un combate."
        />
        <NumberField
          id="coinsPerLoss" label="Monedas por derrota" unit="monedas" value={form.coinsPerLoss}
          onChange={(v) => setField('coinsPerLoss', v)} disabled={disabled}
          hint="Premio de consolación tras una derrota."
        />
      </div>

      <div className="config-field">
        <span className="config-label" id="config-market-prices">Precios de mercado por tier</span>
        <span className="config-hint">
          Durante la temporada: cláusula de robo inicial de cada Pokémon y precio de compra en el banquillo. Al
          liberar uno se recibe la mitad. El precio de cada pick del draft se fija al preparar el draft.
        </span>
        <TierNumberRow
          values={tierValues(form, PRICE_KEY)}
          onChange={(tier, v) => setField(PRICE_KEY[tier], v)}
          labelFor={(tier) => `Precio de mercado del tier ${tier}`}
          disabled={disabled}
        />
        {zero.length > 0 && (
          <Notice variant="warning">
            {zero.length === 5 ? 'Todos los tiers tienen' : `${zero.length === 1 ? 'El tier' : 'Los tiers'} ${zero.join(', ')} ${zero.length === 1 ? 'tiene' : 'tienen'}`}
            {' '}precio 0: robar esos Pokémon es gratis (y su dueño no cobra nada) hasta que suba la cláusula, y
            comprarlos del banquillo tampoco cuesta.
          </Notice>
        )}
      </div>
    </section>
  );
}
