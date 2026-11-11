import { useEffect, useRef } from 'react';
import type { ReactNode, RefObject } from 'react';
import { createPortal } from 'react-dom';
import { motion, useDragControls } from 'motion/react';
import type { PanInfo } from 'motion/react';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { useBackHandler } from '../../hooks/useBackButton';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import styles from './Sheet.module.css';

interface SheetProps {
  /** Id del título (`useId`) que nombra el panel. */
  labelledBy: string;
  describedBy?: string;
  /** `alertdialog` para confirmaciones. */
  role?: 'dialog' | 'alertdialog';
  onClose: () => void;
  /** false mientras hay una acción en curso: ni arrastre, ni fondo, ni Escape, ni atrás lo cierran. */
  canClose?: boolean;
  /** Dónde empieza el foco; sin él, el propio panel. */
  initialFocusRef?: RefObject<HTMLElement | null>;
  children: ReactNode;
}

/** Arrastrar hacia abajo más de esto, o soltar con esta velocidad, cierra el panel. */
const CLOSE_OFFSET = 100;
const CLOSE_VELOCITY = 500;

/**
 * Panel que sube desde abajo (móvil). Misma semántica que `Modal`: rol, título, foco atrapado y devuelto,
 * Escape, fondo y atrás de Android cierran; además se cierra arrastrando el asa hacia abajo. Solo el asa
 * arrastra: así el contenido puede hacer scroll o usar sus propios gestos (p. ej. encuadrar la foto).
 */
export default function Sheet({
  labelledBy, describedBy, role = 'dialog', onClose, canClose = true, initialFocusRef, children,
}: SheetProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const pressedOnBackdrop = useRef(false);
  const reduceMotion = useReducedMotion();
  const dragControls = useDragControls();
  useFocusTrap(panelRef, { initialFocusRef, onEscape: canClose ? onClose : undefined });
  useBackHandler(canClose ? onClose : undefined);

  useEffect(() => {
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = overflow; };
  }, []);

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (canClose && (info.offset.y > CLOSE_OFFSET || info.velocity.y > CLOSE_VELOCITY)) onClose();
  };

  return createPortal(
    <div
      className={styles.backdrop}
      data-testid="sheet-backdrop"
      onMouseDown={(e) => { pressedOnBackdrop.current = e.target === e.currentTarget; }}
      onClick={(e) => { if (pressedOnBackdrop.current && e.target === e.currentTarget && canClose) onClose(); }}
    >
      <motion.div
        ref={panelRef}
        className={styles.panel}
        role={role}
        aria-modal="true"
        aria-labelledby={labelledBy}
        aria-describedby={describedBy}
        tabIndex={-1}
        initial={reduceMotion ? false : { y: '100%' }}
        animate={{ y: 0 }}
        transition={{ type: 'spring', stiffness: 420, damping: 40 }}
        drag={canClose ? 'y' : false}
        dragControls={dragControls}
        dragListener={false}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 0.6 }}
        onDragEnd={onDragEnd}
      >
        <div
          className={styles.handleArea}
          data-testid="sheet-handle"
          aria-hidden="true"
          onPointerDown={(e) => { if (canClose) dragControls.start(e); }}
        >
          <div className={styles.handle} />
        </div>
        <div className={styles.content}>{children}</div>
      </motion.div>
    </div>,
    document.body,
  );
}
