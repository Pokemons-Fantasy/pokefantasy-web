import type { SectionProps } from './types';
import type { LeagueSettings } from '../../api/leagues';

const WEEKDAYS = [
  { value: 1, label: 'Lunes' },
  { value: 2, label: 'Martes' },
  { value: 3, label: 'Miércoles' },
  { value: 4, label: 'Jueves' },
  { value: 5, label: 'Viernes' },
  { value: 6, label: 'Sábado' },
  { value: 7, label: 'Domingo' },
];

interface WindowFieldProps extends SectionProps {
  id: string;
  label: string;
  dayKey: 'stealWindowCloseDay' | 'swapWindowCloseDay';
  timeKey: 'stealWindowCloseTime' | 'swapWindowCloseTime';
  hint: string;
}

function WindowField({ form, setField, disabled, id, label, dayKey, timeKey, hint }: WindowFieldProps) {
  return (
    <fieldset className="config-field config-fieldset" aria-describedby={`${id}-hint`}>
      <legend className="config-label">{label}</legend>
      <div className="config-inline">
        <select
          id={`${id}-day`}
          className="search-input"
          aria-label={`${label}: día`}
          value={form[dayKey] as LeagueSettings[typeof dayKey]}
          onChange={(e) => setField(dayKey, Number(e.target.value))}
          disabled={disabled}
        >
          {WEEKDAYS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
        </select>
        <input
          id={`${id}-time`}
          className="search-input"
          type="time"
          aria-label={`${label}: hora`}
          value={form[timeKey] as LeagueSettings[typeof timeKey]}
          onChange={(e) => setField(timeKey, e.target.value)}
          disabled={disabled}
        />
      </div>
      <span id={`${id}-hint`} className="config-hint">{hint}</span>
    </fieldset>
  );
}

/** Fecha de la primera jornada y cierre semanal de las ventanas de mercado. */
export default function CalendarSection(props: SectionProps) {
  const { form, setField, disabled } = props;
  return (
    <section className="config-section" aria-labelledby="config-calendar">
      <h2 id="config-calendar" className="config-section-title">Calendario y ventanas</h2>

      <div className="config-field">
        <label className="config-label" htmlFor="seasonStartDate">Fecha del primer fin de semana</label>
        <input
          id="seasonStartDate"
          className="search-input config-date"
          type="date"
          value={form.seasonStartDate}
          onChange={(e) => setField('seasonStartDate', e.target.value)}
          disabled={disabled}
          aria-describedby="seasonStartDate-hint"
        />
        <span id="seasonStartDate-hint" className="config-hint">
          Sábado de la jornada 1. Cada jornada dura una semana.
        </span>
      </div>

      <div className="config-grid-2">
        <WindowField
          {...props} id="steal-window" label="Cierre de la ventana de robos"
          dayKey="stealWindowCloseDay" timeKey="stealWindowCloseTime" hint="Por defecto: jueves 23:59."
        />
        <WindowField
          {...props} id="swap-window" label="Cierre de la ventana de intercambios"
          dayKey="swapWindowCloseDay" timeKey="swapWindowCloseTime" hint="Por defecto: viernes 16:00."
        />
      </div>
    </section>
  );
}
