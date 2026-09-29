import type { Tier } from '../../api/pokemons';
import type { BoardCell, DraftBoardData } from '../../utils/draftBoard';
import type { SpendingSummary } from '../../utils/draftBudget';
import { coinsLabel } from '../../utils/coins';
import { TIER_ORDER } from '../../utils/tiers';
import { spriteUrl } from '../../utils/sprites';
import TierBadge from '../TierBadge';
import UserAvatar from '../avatar/UserAvatar';

interface DraftBoardProps {
  board: DraftBoardData;
  /** Usuario en sesión: su columna se resalta. */
  me: string | null;
  tierByName: Map<string, Tier | null | undefined>;
  onSelect: (pokemonName: string) => void;
  /** Monedas que le quedan a cada jugador (draft con presupuesto): se muestran en su cabecera. */
  budgets?: Record<string, number> | null;
  /** Reparto por tiers y gasto de cada jugador: fila de resumen al pie. */
  spending?: Map<string, SpendingSummary> | null;
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function cellLabel(round: number, cell: BoardCell): string {
  const where = `Ronda ${round}, pick ${cell.pickNumber}`;
  if (!cell.pick) return cell.isCurrent ? `${where}: turno de ${cell.username}` : `${where}: pendiente`;
  const owner = cell.currentOwner ? `, ahora en ${cell.currentOwner}` : '';
  const price = cell.pick.price != null ? ` por ${coinsLabel(cell.pick.price)}` : '';
  return `${where}: ${cell.username} eligió ${capitalize(cell.pick.pokemonName)}${price}${owner}`;
}

/** Tablero ronda × jugador a partir de draftHistory. Sirve para el draft en curso y para el terminado. */
export default function DraftBoard({ board, me, tierByName, onSelect, budgets, spending }: DraftBoardProps) {
  return (
    <div className="draft-board" role="region" aria-label="Tablero del draft" tabIndex={0}>
      <table>
        <thead>
          <tr>
            <th scope="col" className="draft-board-corner"><span className="sr-only">Ronda</span></th>
            {board.players.map((player) => (
              <th
                key={player}
                scope="col"
                className={player === me ? 'mine' : undefined}
                aria-label={player === me ? `${player} (tú)` : undefined}
              >
                <UserAvatar username={player} size={20} className="avatar-inline" />
                {player}
                {budgets && budgets[player] !== undefined && (
                  <span className="draft-board-budget" title="Monedas que le quedan">{budgets[player]}</span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {board.rounds.map(({ round, cells }) => (
            <tr key={round}>
              <th scope="row" aria-label={`Ronda ${round}`}>R{round}</th>
              {cells.map((cell) => {
                const mine = cell.username === me ? ' mine' : '';
                if (!cell.pick) {
                  return (
                    <td
                      key={cell.username}
                      className={`draft-board-empty${cell.isCurrent ? ' current' : ''}${mine}`}
                      aria-label={cellLabel(round, cell)}
                    >
                      {cell.isCurrent && <span className="draft-board-turn">En turno</span>}
                    </td>
                  );
                }
                return (
                  <td key={cell.username} className={mine.trim() || undefined}>
                    <button
                      type="button"
                      className="draft-board-pick"
                      aria-label={cellLabel(round, cell)}
                      onClick={() => onSelect(cell.pick!.pokemonName)}
                    >
                      <TierBadge tier={tierByName.get(cell.pick.pokemonName)} />
                      <span className="draft-board-number" aria-hidden="true">{cell.pickNumber}</span>
                      <img src={spriteUrl(cell.pick.pokemonId)} alt="" className="draft-board-sprite" />
                      <span className="draft-board-name">{cell.pick.pokemonName}</span>
                      {cell.pick.price != null && (
                        <span className="draft-board-price" aria-hidden="true">{cell.pick.price}</span>
                      )}
                      {cell.currentOwner && (
                        <span className="draft-board-owner" aria-hidden="true">→ {cell.currentOwner}</span>
                      )}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
        {spending && spending.size > 0 && (
          <tfoot>
            <tr>
              <th scope="row" aria-label="Resumen">Σ</th>
              {board.players.map((player) => {
                const s = spending.get(player);
                if (!s) return <td key={player} />;
                const label = `${player}: ${TIER_ORDER.map((t) => `${s.counts[t]} ${t}`).join(', ')}; gastado ${coinsLabel(s.spent)}`;
                return (
                  <td key={player} aria-label={label}>
                    <div className="draft-board-summary" aria-hidden="true">
                      <span>{TIER_ORDER.map((t) => `${t}${s.counts[t]}`).join(' · ')}</span>
                      <span>{s.spent} 🪙</span>
                    </div>
                  </td>
                );
              })}
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}
