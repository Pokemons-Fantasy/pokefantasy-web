export interface PendingChange {
  label: string;
  old: number | string;
  new: number | string;
}

interface PendingChangesSidebarProps {
  pendingChanges: PendingChange[];
  error: string;
  savedAt: number | null;
  canEdit: boolean | undefined;
  saving: boolean;
  tierSumOk: boolean;
  onCancel: () => void;
}

export default function PendingChangesSidebar({
  pendingChanges, error, savedAt, canEdit, saving, tierSumOk, onCancel,
}: PendingChangesSidebarProps) {
  const hasChanges = pendingChanges.length > 0;

  return (
    <div className="settings-sidebar">
      {hasChanges && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.6rem 0.9rem',
          borderRadius: 'var(--radius-sm)',
          background: 'rgba(251,191,36,0.07)',
          border: '1px solid rgba(251,191,36,0.3)',
          fontSize: '0.8rem',
          fontWeight: 600,
          color: '#fbbf24',
        }}>
          <span style={{ fontSize: '0.6rem' }}>●</span>
          {pendingChanges.length} cambio{pendingChanges.length !== 1 ? 's' : ''} sin guardar
        </div>
      )}

      {pendingChanges.length > 0 && (
        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          padding: '0.75rem 1rem',
        }}>
          <p className="section-label" style={{ marginBottom: '0.6rem' }}>Cambios pendientes</p>
          {pendingChanges.map((c) => (
            <div
              key={c.label}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                gap: '0.5rem',
                fontSize: '0.78rem',
                marginBottom: '0.3rem',
              }}
            >
              <span style={{ color: 'var(--text-2)' }}>{c.label}</span>
              <span style={{ whiteSpace: 'nowrap', color: 'var(--text-3)', fontFamily: 'var(--font-mono, monospace)' }}>
                {c.old} → <span style={{ color: 'var(--accent)' }}>{c.new}</span>
              </span>
            </div>
          ))}
        </div>
      )}

      {error && (
        <p className="error" style={{ margin: 0 }}>{error}</p>
      )}
      {savedAt && !hasChanges && !error && (
        <p className="success" style={{ margin: 0 }}>✓ Cambios guardados</p>
      )}

      {canEdit && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <button
            type="submit"
            form="settings-form"
            className="btn-primary"
            disabled={saving || !tierSumOk}
          >
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
          <button
            type="button"
            className="btn-ghost"
            onClick={onCancel}
            disabled={saving}
          >
            Cancelar
          </button>
        </div>
      )}
    </div>
  );
}
