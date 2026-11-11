import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DraftPlayerBoard from './DraftPlayerBoard';
import { buildDraftBoard } from '../../utils/draftBoard';
import type { DraftPick, Tier } from '../../api/pokemons';

const pick = (username: string, pokemonName: string, round: number, price?: number): DraftPick => ({
  username, pokemonName, pokemonId: 1, round, pickedAt: '2026-09-01T10:00:00Z', price,
});

const BOARD = buildDraftBoard({
  history: [pick('ash', 'mewtwo', 1, 300), pick('misty', 'starmie', 1, 150)],
  turnOrder: ['misty', 'ash'],
  currentPicks: [pick('misty', 'mewtwo', 1, 300), pick('misty', 'starmie', 1, 150)],
  totalRounds: 2,
  current: { round: 2, username: 'misty' },
});
const TIERS = new Map<string, Tier | null | undefined>([['mewtwo', 'S'], ['starmie', 'A']]);

function renderBoard(me: string | null = 'ash', onSelect = vi.fn()) {
  render(
    <DraftPlayerBoard
      board={BOARD}
      me={me}
      tierByName={TIERS}
      budgets={{ ash: 200, misty: 350 }}
      onSelect={onSelect}
    />,
  );
  return onSelect;
}

const rows = () => within(screen.getByRole('tabpanel')).getAllByRole('listitem').map((li) => li.textContent);

describe('DraftPlayerBoard', () => {
  it('chips con tu chip primero y el que está eligiendo marcado', () => {
    renderBoard();
    const list = screen.getByRole('tablist', { name: 'Jugadores' });
    const tabs = within(list).getAllByRole('tab');
    expect(tabs.map((t) => t.getAttribute('aria-label'))).toEqual(['Tú, ash', 'misty, eligiendo']);
    expect(tabs[0]).toHaveTextContent('Tú');
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
  });

  it('muestra tus rondas: pick con tier y precio, y lo pendiente', () => {
    renderBoard();
    const [r1, r2] = rows();
    expect(r1).toContain('R1');
    expect(r1).toContain('Mewtwo');
    expect(r1).toContain('300 monedas');
    expect(r1).toContain('ahora en misty');
    expect(r2).toContain('R2');
    expect(r2).toContain('pendiente');
    expect(screen.getByText('Te quedan 200 monedas')).toBeInTheDocument();
  });

  it('otra chip muestra las rondas de ese jugador', async () => {
    renderBoard();
    await userEvent.click(screen.getByRole('tab', { name: 'misty, eligiendo' }));
    const [r1, r2] = rows();
    expect(r1).toContain('Starmie');
    expect(r2).toContain('eligiendo');
    expect(screen.getByText('Le quedan 350 monedas')).toBeInTheDocument();
  });

  it('pulsar un pick abre su ficha', async () => {
    const onSelect = renderBoard();
    await userEvent.click(screen.getByRole('button', { name: /Mewtwo/ }));
    expect(onSelect).toHaveBeenCalledWith('mewtwo');
  });

  it('si no juegas, sin chip "Tú" y con el primero elegido', () => {
    renderBoard('oak');
    const tabs = screen.getAllByRole('tab');
    expect(tabs.map((t) => t.getAttribute('aria-label'))).toEqual(['misty, eligiendo', 'ash']);
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
  });
});
