export interface PendingChange {
  label: string;
  old: number | string;
  new: number | string;
}

interface SaveBarProps {
  /** "3 cambios sin guardar". */
  summary: string;
  /** Detalle antes → después; sin él no hay desplegable. */
  changes?: PendingChange[];
  error?: string | null;
  saving: boolean;
  saveLabel: string;
  /** Con `formId` el botón envía ese formulario (su onSubmit valida); si no, llama a `onSave`. */
  formId?: string;
  onSave?: () => void;
  canSave?: boolean;
  onDiscard: () => void;
}

/**
 * Barra fija abajo con los cambios pendientes, Descartar y Guardar. Se monta solo cuando hay cambios.
 * Mismo patrón en Configuración y en Preparar draft.
 */
export default function SaveBar({
  summary, changes, error, saving, saveLabel, formId, onSave, canSave = true, onDiscard,
}: SaveBarProps) {
  return (
    <div className="save-bar" role="region" aria-label="Cambios sin guardar">
      <div className="save-bar-info">
        <span className="save-bar-summary">
          <span className="save-bar-dot" aria-hidden="true" />
          {summary}
        </span>
        {changes && changes.length > 0 && (
          <details className="save-bar-details">
            <summary>Ver cambios</summary>
            <ul>
              {changes.map((c) => (
                <li key={c.label}>
                  <span>{c.label}</span>
                  <span className="save-bar-diff">{c.old} → <strong>{c.new}</strong></span>
                </li>
              ))}
            </ul>
          </details>
        )}
        {error && <p className="error save-bar-error" role="alert">{error}</p>}
      </div>
      <div className="save-bar-actions">
        <button type="button" className="btn-ghost" onClick={onDiscard} disabled={saving}>
          Descartar cambios
        </button>
        <button
          type={formId ? 'submit' : 'button'}
          form={formId}
          className="btn-primary"
          onClick={formId ? undefined : onSave}
          disabled={saving || !canSave}
        >
          {saving ? 'Guardando...' : saveLabel}
        </button>
      </div>
    </div>
  );
}
