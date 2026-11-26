import { useId, useState } from 'react';
import Modal from '../Modal';
import type { JornadaDto } from '../../api/leagues';
import { formatDate, parseLocalDate } from '../../utils/dates';
import { shiftPreview } from '../../utils/schedule';

/** Semanas que se pueden elegir: de -12 a 12, sin el 0 (lo valida también el back). */
const WEEK_OPTIONS = [...Array.from({ length: 12 }, (_, i) => -12 + i), ...Array.from({ length: 12 }, (_, i) => i + 1)];

const weeksLabel = (weeks: number) => {
  const n = Math.abs(weeks);
  return `${weeks < 0 ? 'Adelantar' : 'Aplazar'} ${n} ${n === 1 ? 'semana' : 'semanas'}`;
};

interface ShiftScheduleModalProps {
  jornadas: JornadaDto[];
  /** Primera jornada que se mueve; las siguientes van con ella. */
  fromRound: number;
  /** Es la jornada actual: moverla reabre su mercado y borra las alineaciones. */
  isCurrent: boolean;
  pending: boolean;
  onConfirm: (weeks: number) => void;
  onClose: () => void;
}

/** Admin: mueve en cascada una jornada y las siguientes, con la vista previa de las fechas nuevas. */
export default function ShiftScheduleModal({
  jornadas, fromRound, isCurrent, pending, onConfirm, onClose,
}: ShiftScheduleModalProps) {
  const titleId = useId();
  const selectId = useId();
  const warningId = useId();
  const [weeks, setWeeks] = useState(1);
  const rows = shiftPreview(jornadas, fromRound, weeks);

  return (
    // El aviso de la jornada actual describe el diálogo: el lector de pantalla lo lee al abrirlo
    <Modal labelledBy={titleId} describedBy={isCurrent ? warningId : undefined} onClose={onClose} canClose={!pending}>
      <h2 id={titleId}>Mover jornadas</h2>
      <p className="shift-intro">La jornada {fromRound} y todas las siguientes se mueven a la vez.</p>

      <label className="config-label" htmlFor={selectId}>Semanas</label>
      <select
        id={selectId}
        className="search-input"
        value={weeks}
        onChange={(e) => setWeeks(Number(e.target.value))}
        disabled={pending}
      >
        {WEEK_OPTIONS.map((w) => <option key={w} value={w}>{weeksLabel(w)}</option>)}
      </select>

      <ul className="shift-preview" aria-label="Fechas nuevas">
        {rows.map((r) => {
          // Al cruzar de año, sin el año "sáb 2 ene" sería ambiguo
          const withYear = r.from.slice(0, 4) !== r.to.slice(0, 4);
          return (
            <li key={r.roundNumber}>
              <span className="shift-preview-round">Jornada {r.roundNumber}</span>
              <span className="shift-preview-from">{formatDate(parseLocalDate(r.from), withYear)}</span>
              <span className="sr-only"> pasa a </span>
              <span aria-hidden="true">→</span>
              <span className="shift-preview-to">{formatDate(parseLocalDate(r.to), withYear)}</span>
            </li>
          );
        })}
      </ul>

      {isCurrent && (
        <p id={warningId} className="field-hint shift-warning">
          Se reabrirá el mercado de esta jornada y se borrarán las alineaciones ya declaradas.
        </p>
      )}

      <div className="modal-actions">
        <button type="button" className="btn-ghost" onClick={onClose} disabled={pending}>Cancelar</button>
        {/* aria-disabled y no disabled: el botón pulsado conserva el foco mientras se guarda */}
        <button
          type="button"
          className="btn-primary"
          aria-disabled={pending}
          onClick={() => { if (!pending) onConfirm(weeks); }}
        >
          {pending ? 'Moviendo…' : 'Mover'}
        </button>
      </div>
    </Modal>
  );
}
