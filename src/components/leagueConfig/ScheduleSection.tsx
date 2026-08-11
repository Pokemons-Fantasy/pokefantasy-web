import type { SectionProps } from './types';

export default function ScheduleSection({ form, setField, disabled }: SectionProps) {
  return (
    <>
      <hr className="divider" style={{ margin: '1.5rem 0 1rem' }} />
      <p className="section-label" style={{ marginBottom: '1rem' }}>Calendario de temporada</p>

      <div className="config-field">
        <label className="section-label" htmlFor="seasonStartDate">
          Fecha del primer fin de semana
        </label>
        <input
          id="seasonStartDate"
          className="search-input"
          type="date"
          value={form.seasonStartDate}
          onChange={(e) => setField('seasonStartDate', e.target.value)}
          disabled={disabled}
        />
        <span className="config-hint">
          Sábado de la jornada 1. El sistema asigna automáticamente una semana por jornada.
        </span>
      </div>

      <div className="config-field">
        <label className="section-label" htmlFor="maxTeamSize">
          Tamaño máximo del equipo
        </label>
        <input
          id="maxTeamSize"
          className="search-input"
          type="number"
          min={10}
          step={1}
          value={form.maxTeamSize}
          onChange={(e) => setField('maxTeamSize', Number(e.target.value))}
          disabled={disabled}
        />
        <span className="config-hint">
          Máximo de Pokémon que puede tener un jugador post-draft (mínimo 10, por defecto 20).
        </span>
      </div>

      <div className="config-field">
        <label className="section-label" htmlFor="turnTimerSeconds">
          Tiempo por turno (segundos, 0 = sin límite)
        </label>
        <input
          id="turnTimerSeconds"
          className="search-input"
          type="number"
          min={0}
          step={1}
          value={form.turnTimerSeconds}
          onChange={(e) => setField('turnTimerSeconds', Number(e.target.value))}
          disabled={disabled}
        />
        <span className="config-hint">
          Si el jugador en turno no elige en este tiempo, se asigna un Pokémon aleatorio. 0 desactiva el temporizador.
        </span>
      </div>
    </>
  );
}
