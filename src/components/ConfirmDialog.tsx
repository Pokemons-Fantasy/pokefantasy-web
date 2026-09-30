import { useEffect, useId, useRef } from 'react';

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel: string;
  /** Texto del botón de volver; cambiarlo cuando "Cancelar" se confunda con la acción (p. ej. cancelar el draft). */
  cancelLabel?: string;
  pendingLabel: string;
  pending: boolean;
  /** Acción destructiva: botón rojo. */
  danger?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

/**
 * Confirmación accesible: el foco empieza en "Cancelar" (lo seguro) y al cerrar vuelve a donde estaba;
 * Escape y el fondo cierran, y mientras la acción está en curso no se puede cerrar.
 */
export default function ConfirmDialog({
  title, message, confirmLabel, cancelLabel = 'Cancelar', pendingLabel, pending, danger = false, onConfirm, onClose,
}: ConfirmDialogProps) {
  const titleId = useId();
  const messageId = useId();
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    cancelRef.current?.focus();
    return () => previous?.focus();
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !pending) onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [pending, onClose]);

  return (
    <div
      className="modal-overlay"
      onClick={(e) => { if (e.target === e.currentTarget && !pending) onClose(); }}
    >
      <div
        className="modal animate-in-fast confirm-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={messageId}
      >
        <h2 id={titleId}>{title}</h2>
        <p id={messageId} className="confirm-dialog-message">{message}</p>
        <div className="modal-actions">
          <button ref={cancelRef} type="button" className="btn-ghost" onClick={onClose} disabled={pending}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={danger ? 'btn-danger' : 'btn-primary'}
            onClick={onConfirm}
            disabled={pending}
          >
            {pending ? pendingLabel : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
