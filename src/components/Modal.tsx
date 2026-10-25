import { useRef } from 'react';
import type { CSSProperties, ReactNode, RefObject } from 'react';
import { useFocusTrap } from '../hooks/useFocusTrap';

interface ModalProps {
  /** Id del título (`useId`) que nombra el diálogo. */
  labelledBy: string;
  describedBy?: string;
  /** `alertdialog` para confirmaciones. */
  role?: 'dialog' | 'alertdialog';
  onClose: () => void;
  /** false mientras hay una acción en curso: ni Escape ni el fondo cierran. */
  canClose?: boolean;
  /** Dónde empieza el foco; sin él, el propio diálogo. */
  initialFocusRef?: RefObject<HTMLElement | null>;
  /** Clases además de `modal animate-in-fast`. */
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}

/**
 * Modal accesible: rol y título, foco atrapado dentro y devuelto al cerrar, Escape y clic en el fondo cierran.
 * El clic en el fondo solo cuenta si la pulsación empezó en él: al arrastrar desde dentro y soltar fuera, el
 * navegador lanza el click en el fondo.
 */
export default function Modal({
  labelledBy, describedBy, role = 'dialog', onClose, canClose = true, initialFocusRef, className, style, children,
}: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const pressedOnBackdrop = useRef(false);
  useFocusTrap(dialogRef, { initialFocusRef, onEscape: canClose ? onClose : undefined });

  return (
    <div
      className="modal-overlay"
      onMouseDown={(e) => { pressedOnBackdrop.current = e.target === e.currentTarget; }}
      onClick={(e) => { if (pressedOnBackdrop.current && e.target === e.currentTarget && canClose) onClose(); }}
    >
      <div
        ref={dialogRef}
        className={className ? `modal animate-in-fast ${className}` : 'modal animate-in-fast'}
        style={style}
        role={role}
        aria-modal="true"
        aria-labelledby={labelledBy}
        aria-describedby={describedBy}
        tabIndex={-1}
      >
        {children}
      </div>
    </div>
  );
}
