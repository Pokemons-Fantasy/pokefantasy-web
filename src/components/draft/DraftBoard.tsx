import type { Tier } from '../../api/pokemons';
import type { BoardCell, DraftBoardData } from '../../utils/draftBoard';
import { spriteUrl } from '../../utils/sprites';
import TierBadge from '../TierBadge';
import UserAvatar from '../avatar/UserAvatar';

interface DraftBoardProps {
  board: DraftBoardData;
  /** Usuario en sesión: su columna se resalta. */
  me: string | null;
  tierByName: Map<string, Tier | null | undefined>;
  onSelect: (pokemonName: string) => void;
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function cellLabel(round: number, cell: BoardCell): string {
  const where = `Ronda ${round}, pick ${cell.pickNumber}`;
  if (!cell.pick) return cell.isCurrent ? `${where}: turno de ${cell.username}` : `${where}: pendiente`;
  const owner = cell.currentOwner ? `, ahora en ${cell.currentOwner}` : '';
  return `${where}: ${cell.username} eligió ${capitalize(cell.pick.pokemonName)}${owner}`;
}

/** Tablero ronda × jugador a partir de draftHistory. Sirve para el draft en curso y para el terminado. */
export default function DraftBoard({ board, me, tierByName, onSelect }: DraftBoardProps) {
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
      </table>
    </div>
  );
}
