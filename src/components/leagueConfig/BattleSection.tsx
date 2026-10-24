import type { SectionProps } from './types';
import type { BattleGameType, TeamSheet } from '../../api/leagues';
import { BEST_OF_LABELS, GAME_TYPE_LABELS, pickedTeamSizeLabel, TEAM_SHEET_LABELS } from '../../utils/showdown';

const PICKED_SIZES = [6, 5, 4, 3, 2, 1];

/** Formato de los combates en Showdown: modo, Pokémon que se eligen, lista y serie. */
export default function BattleSection({ form, setField, disabled }: SectionProps) {
  return (
    <section className="config-section" aria-labelledby="config-battle">
      <h2 id="config-battle" className="config-section-title">Combates</h2>

      <div className="config-grid-2">
        <div className="config-field">
          <label className="config-label" htmlFor="battleGameType">Modo de combate</label>
          <select
            id="battleGameType"
            className="search-input"
            value={form.battleGameType}
            onChange={(e) => setField('battleGameType', e.target.value as BattleGameType)}
            disabled={disabled}
          >
            {(Object.keys(GAME_TYPE_LABELS) as BattleGameType[]).map((t) => (
              <option key={t} value={t}>{GAME_TYPE_LABELS[t]}</option>
            ))}
          </select>
        </div>

        <div className="config-field">
          <label className="config-label" htmlFor="pickedTeamSize">Pokémon por combate</label>
          <select
            id="pickedTeamSize"
            className="search-input"
            value={form.pickedTeamSize}
            onChange={(e) => setField('pickedTeamSize', Number(e.target.value))}
            disabled={disabled}
            aria-describedby="pickedTeamSize-hint"
          >
            {PICKED_SIZES.map((n) => <option key={n} value={n}>{pickedTeamSizeLabel(n)}</option>)}
          </select>
          <span id="pickedTeamSize-hint" className="config-hint">
            Se llevan 6 y se eligen estos en el Team Preview.
          </span>
        </div>

        <div className="config-field">
          <label className="config-label" htmlFor="teamSheet">Lista</label>
          <select
            id="teamSheet"
            className="search-input"
            value={form.teamSheet}
            onChange={(e) => setField('teamSheet', e.target.value as TeamSheet)}
            disabled={disabled}
          >
            {(Object.keys(TEAM_SHEET_LABELS) as TeamSheet[]).map((s) => (
              <option key={s} value={s}>{TEAM_SHEET_LABELS[s]}</option>
            ))}
          </select>
        </div>

        <div className="config-field">
          <label className="config-label" htmlFor="bestOf">Serie</label>
          <select
            id="bestOf"
            className="search-input"
            value={form.bestOf}
            onChange={(e) => setField('bestOf', Number(e.target.value))}
            disabled={disabled}
          >
            {[3, 1].map((n) => <option key={n} value={n}>{BEST_OF_LABELS[n]}</option>)}
          </select>
        </div>
      </div>
    </section>
  );
}
