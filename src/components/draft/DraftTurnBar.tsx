import { coinsLabel } from '../../utils/coins';
import TurnClock from './TurnClock';
import styles from './DraftTurnBar.module.css';

interface DraftTurnBarProps {
  currentTurn: string | null;
  isMyTurn: boolean;
  /** Tu draft ha terminado (equipo completo o sin dinero) aunque el resto siga. */
  iAmOut: boolean;
  round: number;
  secondsLeft: number | null;
  /** Monedas que te quedan; null si no juegas o no hay presupuesto. */
  remaining: number | null;
  /** Si está, se ofrece volver a elegir (te toca y estás mirando el tablero). */
  onChoose?: () => void;
}

/** Barra fija del draft en móvil: de quién es el turno, la ronda, el reloj y tus monedas. */
export default function DraftTurnBar({
  currentTurn, isMyTurn, iAmOut, round, secondsLeft, remaining, onChoose,
}: DraftTurnBarProps) {
  const who = iAmOut ? 'Tu draft ha terminado' : isMyTurn ? 'Te toca' : `Turno de ${currentTurn ?? '…'}`;

  return (
    <div className={styles.bar} role="status" data-mine={isMyTurn && !iAmOut ? 'true' : undefined}>
      <div className={styles.main}>
        <strong className={styles.who}>{who}</strong>
        <span className={styles.meta}>
          Ronda {round}
          {remaining !== null && ` · Te quedan ${coinsLabel(remaining)}`}
        </span>
      </div>
      {secondsLeft !== null && <TurnClock secondsLeft={secondsLeft} />}
      {onChoose && (
        <button type="button" className="btn-primary" onClick={onChoose}>Elegir</button>
      )}
    </div>
  );
}
