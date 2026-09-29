import type { ReactNode } from 'react';

interface NumberFieldProps {
  id: string;
  label: string;
  value: number;
  onChange: (value: number) => void;
  unit?: string;
  hint?: ReactNode;
  min?: number;
  max?: number;
  disabled?: boolean;
}

/** Campo numérico estrecho con su unidad al lado y la ayuda debajo. */
export default function NumberField({ id, label, value, onChange, unit, hint, min = 0, max, disabled }: NumberFieldProps) {
  const hintId = hint ? `${id}-hint` : undefined;
  return (
    <div className="config-field">
      <label className="config-label" htmlFor={id}>{label}</label>
      <span className="config-number">
        <input
          id={id}
          className="search-input"
          type="number"
          inputMode="numeric"
          min={min}
          max={max}
          step={1}
          value={value}
          disabled={disabled}
          aria-describedby={hintId}
          onChange={(e) => onChange(Number(e.target.value))}
        />
        {unit && <span className="field-unit">{unit}</span>}
      </span>
      {hint && <span id={hintId} className="config-hint">{hint}</span>}
    </div>
  );
}
