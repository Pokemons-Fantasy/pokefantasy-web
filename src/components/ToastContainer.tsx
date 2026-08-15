import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useToastStore } from '../store/toastStore';
import type { Toast, ToastType } from '../store/toastStore';
import { useReducedMotion } from '../hooks/useReducedMotion';

const DISMISS_MS: Record<ToastType, number> = {
  error: 5000,
  success: 3000,
  info: 3000,
};

const COLORS: Record<ToastType, { border: string; bg: string; icon: string }> = {
  success: { border: 'var(--green)', bg: 'rgba(52,211,153,0.1)', icon: '✓' },
  error:   { border: '#f87171',      bg: 'rgba(248,113,113,0.08)', icon: '✕' },
  info:    { border: 'var(--accent)', bg: 'var(--accent-dim)',    icon: 'ℹ' },
};

function ToastItem({ toast }: { toast: Toast }) {
  const removeToast = useToastStore((s) => s.removeToast);
  const navigate = useNavigate();
  const { border, bg, icon } = COLORS[toast.type];
  const persistent = !!toast.actionUrl;

  useEffect(() => {
    if (persistent) return;
    const timer = setTimeout(() => removeToast(toast.id), DISMISS_MS[toast.type]);
    return () => clearTimeout(timer);
  }, [toast.id, toast.type, removeToast, persistent]);

  function handleBodyClick() {
    if (!toast.actionUrl) return;
    removeToast(toast.id);
    navigate(toast.actionUrl);
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.65rem',
        padding: '0.75rem 1rem',
        background: bg,
        border: `1px solid ${border}44`,
        borderLeft: `3px solid ${border}`,
        borderRadius: 'var(--radius-sm)',
        boxShadow: '0 4px 16px rgba(0,0,0,0.35)',
        minWidth: 260,
        maxWidth: 360,
        cursor: persistent ? 'pointer' : 'default',
      }}
      onClick={handleBodyClick}
      role={persistent ? 'button' : undefined}
      title={persistent ? 'Ver actividad' : undefined}
    >
      {/* Icon */}
      <span
        style={{
          flexShrink: 0,
          width: 20,
          height: 20,
          borderRadius: '50%',
          background: `${border}20`,
          border: `1px solid ${border}55`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '0.65rem',
          fontWeight: 700,
          color: border,
          marginTop: '0.05rem',
        }}
        aria-hidden="true"
      >
        {icon}
      </span>

      {/* Message */}
      <span
        style={{
          flex: 1,
          fontSize: '0.85rem',
          color: 'var(--text)',
          lineHeight: 1.45,
        }}
      >
        {toast.message}
        {persistent && (
          <span style={{ display: 'block', fontSize: '0.75rem', color: border, marginTop: '0.2rem' }}>
            Ver actividad →
          </span>
        )}
      </span>

      {/* Dismiss */}
      <button
        onClick={(e) => { e.stopPropagation(); removeToast(toast.id); }}
        style={{
          flexShrink: 0,
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--text-3)',
          fontSize: '0.85rem',
          lineHeight: 1,
          padding: '0.1rem 0.2rem',
        }}
        aria-label="Cerrar"
      >
        ✕
      </button>
    </div>
  );
}

export default function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);
  const clearPersistent = useToastStore((s) => s.clearPersistent);
  const location = useLocation();
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    clearPersistent();
  }, [location.pathname, clearPersistent]);

  const toastVariants = {
    initial: prefersReducedMotion ? { opacity: 0 } : { opacity: 0, x: 60, scale: 0.95 },
    animate: {
      opacity: 1, x: 0, scale: 1,
      transition: prefersReducedMotion ? { duration: 0.15 } : { type: 'spring' as const, stiffness: 350, damping: 26 },
    },
    exit: prefersReducedMotion
      ? { opacity: 0 }
      : { opacity: 0, x: 60, scale: 0.9, transition: { duration: 0.2, ease: [0.4, 0, 1, 1] as const } },
  };

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '1.5rem',
        right: '1.5rem',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column-reverse',
        gap: '0.5rem',
        pointerEvents: 'none',
      }}
      aria-live="polite"
      aria-label="Notificaciones"
    >
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            layout={!prefersReducedMotion}
            variants={toastVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ layout: { type: 'spring', stiffness: 300, damping: 20 } }}
            style={{ pointerEvents: 'auto' }}
          >
            <ToastItem toast={toast} />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
