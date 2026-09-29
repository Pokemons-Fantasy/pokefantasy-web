import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DraftBoard from './DraftBoard';
import { buildDraftBoard } from '../../utils/draftBoard';
import type { DraftPick } from '../../api/pokemons';

const pick = (username: string, pokemonName: string, round: number, pokemonId = 1): DraftPick => ({
  username, pokemonName, pokemonId, round, pickedAt: '2026-09-01T10:00:00Z',
});

const ORDER = ['ash', 'brock'];

function renderBoard(onSelect = vi.fn()) {
  const board = buildDraftBoard({
    history: [pick('ash', 'mewtwo', 1, 150), pick('brock', 'onix', 1, 95)],
    turnOrder: ORDER,
    currentPicks: [pick('brock', 'mewtwo', 1, 150), pick('brock', 'onix', 1, 95)],
    totalRounds: 2,
    current: { round: 2, username: 'ash' },
  });
  render(<DraftBoard board={board} me="ash" tierByName={new Map([['mewtwo', 'S']])} onSelect={onSelect} />);
  return onSelect;
}

describe('DraftBoard', () => {
  it('pinta una columna por jugador y resalta la tuya', () => {
    renderBoard();
    expect(screen.getByRole('columnheader', { name: 'ash (tú)' })).toHaveClass('mine');
    expect(screen.getByRole('columnheader', { name: 'brock' })).not.toHaveClass('mine');
    expect(screen.getByRole('rowheader', { name: 'Ronda 1' })).toBeInTheDocument();
  });

  it('cada pick es un botón accesible que abre el detalle', async () => {
    const onSelect = renderBoard();
    const cell = screen.getByRole('button', { name: /Ronda 1, pick 1: ash eligió Mewtwo/ });
    await userEvent.click(cell);
    expect(onSelect).toHaveBeenCalledWith('mewtwo');
  });

  it('indica a quién pertenece ahora un Pokémon que cambió de manos', () => {
    renderBoard();
    expect(screen.getByText('→ brock')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /ash eligió Mewtwo, ahora en brock/ })).toBeInTheDocument();
  });

  it('marca la casilla del jugador en turno', () => {
    renderBoard();
    expect(screen.getByLabelText('Ronda 2, pick 3: turno de ash')).toHaveTextContent('En turno');
  });
});

describe('DraftBoard con presupuesto', () => {
  it('muestra lo que le queda a cada jugador, el precio de cada pick y el gasto por tiers', () => {
    const history: DraftPick[] = [
      { username: 'ash', pokemonName: 'mew', pokemonId: 151, round: 1, pickedAt: '2026-09-29T10:00:00Z', price: 200 },
    ];
    const board = buildDraftBoard({ history, turnOrder: ['ash', 'brock'] });
    render(
      <DraftBoard
        board={board}
        me="ash"
        tierByName={new Map([['mew', 'S']])}
        onSelect={() => {}}
        budgets={{ ash: 800, brock: 1000 }}
        spending={new Map([['ash', { counts: { S: 1, A: 0, B: 0, C: 0, D: 0 }, spent: 200 }]])}
      />,
    );
    expect(screen.getByText('800')).toBeInTheDocument();
    expect(screen.getByLabelText('Ronda 1, pick 1: ash eligió Mew por 200 monedas')).toBeInTheDocument();
    expect(screen.getByLabelText('ash: 1 S, 0 A, 0 B, 0 C, 0 D; gastado 200 monedas')).toBeInTheDocument();
  });
});
