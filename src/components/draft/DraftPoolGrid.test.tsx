import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DraftPoolGrid from './DraftPoolGrid';
import type { ClosedListEntry, DraftConfig, Tier } from '../../api/pokemons';

const config: DraftConfig = { budget: 100, priceS: 40, priceA: 25, priceB: 15, priceC: 8, priceD: 3, snake: false };
const entry = (pokemonName: string, tier: Tier) =>
  ({ id: pokemonName, pokemonId: 1, pokemonName, nominatedBy: 'ash', sprite: '', tier }) as ClosedListEntry;
const pool = [entry('pidgey', 'D'), entry('mewtwo', 'S'), entry('onix', 'B'), entry('abra', 'B')];

function renderGrid(props: Partial<Parameters<typeof DraftPoolGrid>[0]> = {}) {
  const handlers = { onPick: vi.fn(), onInfo: vi.fn(), onToggleFavorite: vi.fn() };
  render(
    <DraftPoolGrid entries={pool} config={config} remaining={20} canPick={false} picking={false}
      favorites={new Set()} {...handlers} {...props} />,
  );
  return handlers;
}
const cardNames = () => screen.getAllByRole('button', { name: /monedas/ }).map((b) => b.getAttribute('aria-label')!.split(',')[0]);

describe('DraftPoolGrid', () => {
  it('fuera de tu turno se ve todo con tier y precio, pero no se elige; la ficha sí se abre', async () => {
    const { onPick, onInfo } = renderGrid();
    expect(cardNames()).toEqual(['Mewtwo', 'Abra', 'Onix', 'Pidgey']);
    await userEvent.click(screen.getByRole('button', { name: /^Onix, 15 monedas/ }));
    expect(onPick).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Ficha de Onix' }));
    expect(onInfo).toHaveBeenCalledWith(pool[2]);
  });

  it('en tu turno elige solo los que te llegan', async () => {
    const { onPick } = renderGrid({ canPick: true });
    await userEvent.click(screen.getByRole('button', { name: /^Onix/ }));
    expect(onPick).toHaveBeenCalledWith(pool[2]);
    await userEvent.click(screen.getByRole('button', { name: /^Mewtwo, 40 monedas, no te llega/ }));
    expect(onPick).toHaveBeenCalledTimes(1);
  });

  it('filtra por tier con lo que queda de cada uno, ordena y enseña solo los que te llegan', async () => {
    renderGrid();
    const tiers = screen.getByRole('group', { name: 'Tier' });
    expect(within(tiers).getAllByRole('button').map((b) => b.textContent)).toEqual(['Todos (4)', 'S (1)', 'B (2)', 'D (1)']);
    await userEvent.click(within(tiers).getByRole('button', { name: 'B (2)' }));
    expect(cardNames()).toEqual(['Abra', 'Onix']);
    await userEvent.click(within(tiers).getByRole('button', { name: 'Todos (4)' }));

    await userEvent.click(screen.getByRole('button', { name: 'Nombre' }));
    expect(cardNames()).toEqual(['Abra', 'Mewtwo', 'Onix', 'Pidgey']);
    await userEvent.click(screen.getByRole('button', { name: 'Solo los que me llegan' }));
    expect(cardNames()).toEqual(['Abra', 'Onix', 'Pidgey']);
  });

  it('los favoritos salen primero y la estrella los marca y desmarca', async () => {
    const { onToggleFavorite } = renderGrid({ favorites: new Set(['pidgey']) });
    expect(cardNames()[0]).toBe('Pidgey');
    expect(screen.getByRole('button', { name: 'Quitar Pidgey de favoritos' })).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(screen.getByRole('button', { name: 'Marcar Onix como favorito' }));
    expect(onToggleFavorite).toHaveBeenCalledWith('onix');
  });

  it('sin presupuesto en el draft no hay precios ni filtro de "me llegan"', () => {
    renderGrid({ config: null, remaining: null });
    expect(screen.queryByRole('button', { name: 'Solo los que me llegan' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Precio' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Onix' })).toBeInTheDocument();
  });
});
