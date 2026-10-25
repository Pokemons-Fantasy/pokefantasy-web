import { useId, useRef } from 'react';
import Modal from './Modal';

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
 * Confirmación accesible: el foco empieza en "Cancelar" (lo seguro), Tab no sale del diálogo y al cerrar vuelve a donde estaba;
 * Escape y el fondo cierran, y mientras la acción está en curso no se puede cerrar.
 */
export default function ConfirmDialog({
  title, message, confirmLabel, cancelLabel = 'Cancelar', pendingLabel, pending, danger = false, onConfirm, onClose,
}: ConfirmDialogProps) {
  const titleId = useId();
  const messageId = useId();
  const cancelRef = useRef<HTMLButtonElement>(null);

  return (
    <Modal
      role="alertdialog"
      labelledBy={titleId}
      describedBy={messageId}
      onClose={onClose}
      canClose={!pending}
      initialFocusRef={cancelRef}
      className="confirm-dialog"
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
    </Modal>
  );
}
