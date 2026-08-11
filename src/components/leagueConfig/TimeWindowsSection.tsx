import type { SectionProps } from './types';

const WEEKDAYS = [
  { value: 1, label: 'Lunes' },
  { value: 2, label: 'Martes' },
  { value: 3, label: 'Miércoles' },
  { value: 4, label: 'Jueves' },
  { value: 5, label: 'Viernes' },
  { value: 6, label: 'Sábado' },
  { value: 7, label: 'Domingo' },
];

export default function TimeWindowsSection({ form, setField, disabled }: SectionProps) {
  return (
    <>
      <hr className="divider" style={{ margin: '1.5rem 0 1rem' }} />
      <p className="section-label" style={{ marginBottom: '0.35rem' }}>Ventanas de tiempo</p>
      <span className="config-hint" style={{ marginBottom: '1rem', display: 'block' }}>
        Día y hora en que cierra cada ventana dentro de la semana de jornada.
      </span>

      <div className="config-field">
        <label className="section-label">Cierre ventana de robos</label>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <select
            className="search-input"
            value={form.stealWindowCloseDay}
            onChange={(e) => setField('stealWindowCloseDay', Number(e.target.value))}
            disabled={disabled}
            style={{ flex: 1 }}
          >
            {WEEKDAYS.map((d) => (
              <option key={d.value} value={d.value}>{d.label}</option>
            ))}
          </select>
          <input
            className="search-input"
            type="time"
            value={form.stealWindowCloseTime}
            onChange={(e) => setField('stealWindowCloseTime', e.target.value)}
            disabled={disabled}
            style={{ flex: 1 }}
          />
        </div>
        <span className="config-hint">Por defecto: jueves 23:59</span>
      </div>

      <div className="config-field">
        <label className="section-label">Cierre ventana de intercambios</label>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <select
            className="search-input"
            value={form.swapWindowCloseDay}
            onChange={(e) => setField('swapWindowCloseDay', Number(e.target.value))}
            disabled={disabled}
            style={{ flex: 1 }}
          >
            {WEEKDAYS.map((d) => (
              <option key={d.value} value={d.value}>{d.label}</option>
            ))}
          </select>
          <input
            className="search-input"
            type="time"
            value={form.swapWindowCloseTime}
            onChange={(e) => setField('swapWindowCloseTime', e.target.value)}
            disabled={disabled}
            style={{ flex: 1 }}
          />
        </div>
        <span className="config-hint">Por defecto: viernes 16:00</span>
      </div>
    </>
  );
}
