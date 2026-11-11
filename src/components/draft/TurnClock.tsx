import { motion } from 'motion/react';
import { useReducedMotion } from '../../hooks/useReducedMotion';

/** Cuenta atrás del turno: en los últimos 10 s se pone en rojo y late cada vez más rápido. */
export default function TurnClock({ secondsLeft }: { secondsLeft: number }) {
  const prefersReducedMotion = useReducedMotion();
  const urgent = secondsLeft <= 10;
  const urgency = urgent ? (10 - secondsLeft) / 10 : 0; // 0..1
  return (
    <motion.span
      key={urgent ? 'urgent' : 'calm'}
      animate={urgent && !prefersReducedMotion ? { scale: [1, 1.06 + urgency * 0.14, 1] } : { scale: 1 }}
      transition={
        urgent && !prefersReducedMotion
          ? { duration: 0.9 - urgency * 0.5, repeat: Infinity, ease: 'easeInOut' }
          : { duration: 0.2 }
      }
      style={{
        display: 'inline-block',
        fontWeight: 600,
        fontSize: '0.875rem',
        color: urgent ? 'var(--danger)' : 'var(--text-2)',
      }}
    >
      ⏱ {secondsLeft}s
    </motion.span>
  );
}
