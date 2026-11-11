import { useState } from 'react';
import type { Tier } from '../../api/pokemons';
import type { DraftBoardData } from '../../utils/draftBoard';
import type { SpendingSummary } from '../../utils/draftBudget';
import { playerColumn, playerOrder } from '../../utils/draftPlayerBoard';
import { coinsLabel } from '../../utils/coins';
import { spriteUrl } from '../../utils/sprites';
import ChipTabs from '../shell/ChipTabs';
import TierBadge from '../TierBadge';
import styles from './DraftPlayerBoard.module.css';

interface DraftPlayerBoardProps {
  board: DraftBoardData;
  /** Usuario en sesión: su chip va primero y se elige por defecto. */
  me: string | null;
  tierByName: Map<string, Tier | null | undefined>;
  /** Monedas que le quedan a cada jugador (draft con presupuesto). */
  budgets?: Record<string, number> | null;
  /** Gasto de cada jugador. */
  spending?: Map<string, SpendingSummary> | null;
  onSelect: (pokemonName: string) => void;
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Tablero del draft por jugador (móvil): una chip por jugador y sus picks ronda a ronda. */
export default function DraftPlayerBoard({ board, me, tierByName, budgets, spending, onSelect }: DraftPlayerBoardProps) {
  const players = playerOrder(board.players, me);
  const [selected, setSelected] = useState<string>(players[0] ?? '');
  const current = players.includes(selected) ? selected : players[0];
  const isMe = current === me;
  // El que tiene el turno ahora: su casilla vacía de esta ronda está marcada como actual
  const choosing = board.rounds.flatMap((r) => r.cells).find((c) => c.isCurrent)?.username ?? null;

  const left = budgets?.[current];
  const spent = spending?.get(current)?.spent;

  return (
    <div className={styles.board}>
      <ChipTabs
        label="Jugadores"
        idPrefix="jugadores"
        options={players.map((p) => ({
          value: p,
          label: p === me ? 'Tú' : p,
          ariaLabel: `${p === me ? `Tú, ${p}` : p}${p === choosing ? ', eligiendo' : ''}`,
        }))}
        value={current}
        onChange={setSelected}
      />

      <section id="jugadores-panel" role="tabpanel" aria-labelledby={`jugadores-tab-${current}`} className={styles.panel}>
        {(left !== undefined || spent !== undefined) && (
          <p className={styles.money}>
            {spent !== undefined && <span>Gastado {coinsLabel(spent)}</span>}
            {left !== undefined && <span>{isMe ? 'Te quedan' : 'Le quedan'} {coinsLabel(left)}</span>}
          </p>
        )}
        <ol className={styles.rounds}>
          {playerColumn(board, current).map(({ round, cell }) => (
            <li key={round} className={styles.round}>
              <span className={styles.roundLabel}>R{round}</span>
              {cell.pick ? (
                <button type="button" className={styles.pick} onClick={() => onSelect(cell.pick!.pokemonName)}>
                  <img src={spriteUrl(cell.pick.pokemonId)} alt="" width={40} height={40} loading="lazy" />
                  <span className={styles.name}>{capitalize(cell.pick.pokemonName)}</span>
                  <TierBadge tier={tierByName.get(cell.pick.pokemonName) ?? null} />
                  {cell.pick.price != null && <span className={styles.price}>{coinsLabel(cell.pick.price)}</span>}
                  {cell.currentOwner && <span className={styles.owner}>ahora en {cell.currentOwner}</span>}
                </button>
              ) : (
                <span className={styles.empty}>{cell.isCurrent ? 'eligiendo' : 'pendiente'}</span>
              )}
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
