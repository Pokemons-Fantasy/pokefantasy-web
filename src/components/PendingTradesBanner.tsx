import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { getMyPendingTrades } from '../api/trades';
import { getMyLeagues } from '../api/leagues';
import { useReducedMotion } from '../hooks/useReducedMotion';

/**
 * Aviso global de intercambios pendientes. Se muestra en las pantallas de
 * aterrizaje (Home, lista de ligas). Si no hay propuestas pendientes, no
 * renderiza nada. Al desplegarlo, lista las ligas con propuestas y lleva a
 * los intercambios de la liga elegida.
 */
export default function PendingTradesBanner() {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  const { data: pending = [] } = useQuery({
    queryKey: ['my-pending-trades'],
    queryFn: getMyPendingTrades,
    staleTime: 30_000,
  });

  const { data: leagues = [] } = useQuery({
    queryKey: ['my-leagues'],
    queryFn: getMyLeagues,
    staleTime: 60_000,
  });

  if (pending.length === 0) return null;

  const countByLeague = new Map<string, number>();
  for (const t of pending) {
    countByLeague.set(t.leagueId, (countByLeague.get(t.leagueId) ?? 0) + 1);
  }

  const leagueName = (id: string) => leagues.find((l) => l.id === id)?.name ?? 'Liga';
  const total = pending.length;

  const goToLeague = (leagueId: string) => {
    navigate(`/leagues/${leagueId}/teams`, { state: { openTrades: true } });
  };

  return (
    <div
      style={{
        background: 'rgba(251, 191, 36, 0.07)',
        border: '1px solid rgba(251, 191, 36, 0.25)',
        borderRadius: 'var(--radius)',
        marginBottom: '1.25rem',
        overflow: 'hidden',
        animation: 'fadeIn 0.45s ease',
      }}
    >
      <button
        onClick={() => setExpanded((e) => !e)}
        aria-expanded={expanded}
        style={{
          width: '100%',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          padding: '0.875rem 1.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.6rem',
          color: 'var(--accent)',
          fontWeight: 700,
          fontSize: '0.9rem',
          textAlign: 'left',
        }}
      >
        <span aria-hidden="true" style={{ fontSize: '1rem' }}>🔔</span>
        <span style={{ flex: 1 }}>
          Tienes {total} {total === 1 ? 'intercambio pendiente' : 'intercambios pendientes'}
        </span>
        <span aria-hidden="true" style={{ fontSize: '0.7rem' }}>{expanded ? '▲' : '▼'}</span>
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="trade-list"
            initial={prefersReducedMotion ? false : { height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={prefersReducedMotion ? undefined : { height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            style={{ overflow: 'hidden' }}
          >
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                borderTop: '1px solid rgba(251, 191, 36, 0.15)',
              }}
            >
              {[...countByLeague.entries()].map(([leagueId, count]) => (
                <button
                  key={leagueId}
                  onClick={() => goToLeague(leagueId)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '0.7rem 1.25rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.6rem',
                    color: 'var(--text)',
                    fontSize: '0.85rem',
                    textAlign: 'left',
                  }}
                >
                  <span style={{ flex: 1 }}>{leagueName(leagueId)}</span>
                  <span className="badge badge-yellow">{count}</span>
                  <span aria-hidden="true" style={{ color: 'var(--text-3)' }}>→</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
