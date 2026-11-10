import { useRef } from 'react';
import type { CSSProperties, ReactNode, RefObject } from 'react';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { useBackHandler } from '../hooks/useBackButton';
import { useLayoutMode } from '../hooks/useLayoutMode';
import Sheet from './shell/Sheet';

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
  /** Clases además de `modal animate-in-fast` (en móvil, además de `modal modal-in-sheet`). */
  className?: string;
  /** En móvil se ignora `maxWidth`: el sheet ocupa todo el ancho. */
  style?: CSSProperties;
  children: ReactNode;
}

/**
 * Modal accesible: rol y título, foco atrapado dentro y devuelto al cerrar, Escape y clic en el fondo cierran.
 * El clic en el fondo solo cuenta si la pulsación empezó en él: al arrastrar desde dentro y soltar fuera, el
 * navegador lanza el click en el fondo.
 *
 * En móvil se pinta como `Sheet` (sube desde abajo) con las mismas props; el contenido conserva las clases
 * `modal` y `className` para que valgan sus estilos, y `modal-in-sheet` quita lo de cuadro centrado.
 */
export default function Modal(props: ModalProps) {
  const mode = useLayoutMode();
  if (mode === 'desktop') return <DesktopModal {...props} />;

  const { labelledBy, describedBy, role, onClose, canClose, initialFocusRef, className, style, children } = props;
  const sheetStyle = style && { ...style, maxWidth: undefined };
  return (
    <Sheet
      labelledBy={labelledBy} describedBy={describedBy} role={role}
      onClose={onClose} canClose={canClose} initialFocusRef={initialFocusRef}
    >
      <div className={className ? `modal modal-in-sheet ${className}` : 'modal modal-in-sheet'} style={sheetStyle}>
        {children}
      </div>
    </Sheet>
  );
}

function DesktopModal({
  labelledBy, describedBy, role = 'dialog', onClose, canClose = true, initialFocusRef, className, style, children,
}: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const pressedOnBackdrop = useRef(false);
  useFocusTrap(dialogRef, { initialFocusRef, onEscape: canClose ? onClose : undefined });
  useBackHandler(canClose ? onClose : undefined);

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
