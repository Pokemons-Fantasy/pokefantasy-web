import UserAvatar from '../avatar/UserAvatar';
import { moveTurn, shuffleTurnOrder } from '../../utils/turnOrder';

interface TurnOrderEditorProps {
  order: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
}

/** Orden de turnos del draft: flechas para subir y bajar a cada jugador y "Barajar". */
export default function TurnOrderEditor({ order, onChange, disabled = false }: TurnOrderEditorProps) {
  return (
    <>
      <div className="turn-order-toolbar">
        <p className="turn-order-hint">Ordena los jugadores para definir el orden de turnos.</p>
        <button
          type="button"
          className="btn-ghost turn-order-shuffle"
          title="Orden aleatorio"
          onClick={() => onChange(shuffleTurnOrder(order))}
          disabled={disabled || order.length < 2}
        >
          Barajar
        </button>
      </div>

      <div className="turn-order-list">
        {order.map((player, i) => (
          <div key={player} className="turn-order-item">
            <span className="turn-order-num">{i + 1}</span>
            <UserAvatar username={player} size={32} />
            <span className="turn-order-name">{player}</span>
            <div className="turn-order-arrows">
              <button
                type="button"
                className="arrow-btn"
                onClick={() => onChange(moveTurn(order, i, -1))}
                disabled={disabled || i === 0}
                title="Subir"
                aria-label={`Subir a ${player}`}
              >↑</button>
              <button
                type="button"
                className="arrow-btn"
                onClick={() => onChange(moveTurn(order, i, 1))}
                disabled={disabled || i === order.length - 1}
                title="Bajar"
                aria-label={`Bajar a ${player}`}
              >↓</button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
