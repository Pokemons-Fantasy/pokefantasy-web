import { Link } from 'react-router-dom';
import type { TeamsSummary } from '../../utils/teamsSummary';
import CoinBadge from './CoinBadge';
import styles from './TeamsSummaryCard.module.css';

interface TeamsSummaryCardProps {
  summary: TeamsSummary;
  coins: number | undefined;
  /** Intercambios que esperan tu respuesta. */
  pendingTrades: number;
  onOpenTrades: () => void;
}

/** Card de resumen de Equipos en móvil: jornada, tu partido, mercado, monedas e intercambios. */
export default function TeamsSummaryCard({ summary, coins, pendingTrades, onOpenTrades }: TeamsSummaryCardProps) {
  const windows = [
    { kind: 'steal', label: 'Robos', status: summary.steal },
    { kind: 'swap', label: 'Intercambios y banquillo', status: summary.swap },
  ];

  return (
    <section className={styles.card} aria-label="Resumen de la jornada">
      {(summary.roundNumber !== null || summary.last) && (
        <div className={styles.meta}>
          {summary.roundNumber !== null && <span>Jornada {summary.roundNumber}</span>}
          {summary.last && <span className={styles.last}>Último: {summary.last}</span>}
        </div>
      )}

      {summary.opponent
        ? <Link className={styles.headline} to="../schedule">{summary.headline}</Link>
        : <p className={styles.headline}>{summary.headline}</p>}
      {summary.nextLine && <p className={styles.next}>{summary.nextLine}</p>}

      <div className={`market-status ${styles.market}`} role="status" aria-label="Estado del mercado">
        {windows.map(({ kind, label, status }) => (
          <div key={kind} className={`market-chip ${status.open ? 'open' : 'closed'}`}>
            <span className="market-chip-dot" aria-hidden="true" />
            <strong>{label}</strong>
            <span>{status.text}</span>
          </div>
        ))}
      </div>

      <div className={styles.footer}>
        {coins !== undefined ? <CoinBadge coins={coins} /> : <span />}
        <button type="button" className={`btn-ghost ${styles.trades}`} onClick={onOpenTrades}>
          Intercambios
          {pendingTrades > 0 && (
            <>
              <span className={styles.count} aria-hidden="true">{pendingTrades}</span>
              <span className="sr-only">{`, ${pendingTrades} pendientes`}</span>
            </>
          )}
        </button>
      </div>
    </section>
  );
}
