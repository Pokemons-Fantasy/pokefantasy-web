import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useReducedMotion } from '../../hooks/useReducedMotion';

interface CoinBadgeProps {
  coins: number;
}

export default function CoinBadge({ coins }: CoinBadgeProps) {
  const prefersReducedMotion = useReducedMotion();
  const prevRef = useRef(coins);
  const [flash, setFlash] = useState<'up' | 'down' | null>(null);

  useEffect(() => {
    if (coins === prevRef.current) return;
    const direction = coins > prevRef.current ? 'up' : 'down';
    prevRef.current = coins;
    if (prefersReducedMotion) return;
    setFlash(direction);
    const t = setTimeout(() => setFlash(null), 900);
    return () => clearTimeout(t);
  }, [coins, prefersReducedMotion]);

  const flashColor = flash === 'up' ? 'var(--green, #34d399)' : 'var(--red, #f87171)';

  return (
    <motion.span
      className="coin-badge"
      style={{ position: 'relative', overflow: 'hidden' }}
      animate={flash ? { scale: [1, 1.15, 1] } : { scale: 1 }}
      transition={{ type: 'spring', stiffness: 350, damping: 20 }}
    >
      <AnimatePresence>
        {flash && (
          <motion.span
            key="flash-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.35 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            style={{ position: 'absolute', inset: 0, background: flashColor, borderRadius: 'inherit' }}
            aria-hidden="true"
          />
        )}
      </AnimatePresence>
      💰{' '}
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={coins}
          initial={prefersReducedMotion ? false : { y: flash === 'down' ? -8 : 8, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={prefersReducedMotion ? undefined : { y: flash === 'down' ? 8 : -8, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 350, damping: 24 }}
          style={{ display: 'inline-block' }}
        >
          {coins}
        </motion.span>
      </AnimatePresence>
    </motion.span>
  );
}
