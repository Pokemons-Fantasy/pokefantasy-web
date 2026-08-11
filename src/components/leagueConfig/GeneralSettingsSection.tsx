import type { SectionProps } from './types';

export default function GeneralSettingsSection({ form, setField, disabled }: SectionProps) {
  return (
    <>
      <div className="config-field">
        <label className="section-label" htmlFor="coinsPerWin">
          Monedas por victoria
        </label>
        <input
          id="coinsPerWin"
          className="search-input"
          type="number"
          min={0}
          step={1}
          value={form.coinsPerWin}
          onChange={(e) => setField('coinsPerWin', Number(e.target.value))}
          disabled={disabled}
        />
        <span className="config-hint">Lo que ganan los jugadores al ganar un combate.</span>
      </div>

      <div className="config-field">
        <label className="section-label" htmlFor="coinsPerLoss">
          Monedas por derrota
        </label>
        <input
          id="coinsPerLoss"
          className="search-input"
          type="number"
          min={0}
          step={1}
          value={form.coinsPerLoss}
          onChange={(e) => setField('coinsPerLoss', Number(e.target.value))}
          disabled={disabled}
        />
        <span className="config-hint">Premio de consolación tras una derrota.</span>
      </div>
    </>
  );
}
