import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import PoolPage from './PoolPage';
import { useAuthStore } from '../store/authStore';
import * as pokemonsApi from '../api/pokemons';
import type { AvailablePokemon, ClosedListEntry, DraftStatus } from '../api/pokemons';

vi.mock('../api/pokemons', async (importOriginal) => ({
  ...(await importOriginal<typeof pokemonsApi>()),
  getAvailablePokemons: vi.fn(),
  getClosedList: vi.fn(),
  getDraftStatus: vi.fn(),
  nominatePokemon: vi.fn(),
  denominatePokemon: vi.fn(),
}));
const api = vi.mocked(pokemonsApi);

const AVAILABLE: AvailablePokemon[] = [
  { id: 1, name: 'bulbasaur', spriteUrl: '', types: ['grass', 'poison'] },
  { id: 7, name: 'squirtle', spriteUrl: '', types: ['water'] },
  { id: 25, name: 'pikachu', spriteUrl: '', types: ['electric'] },
  { id: 54, name: 'psyduck', spriteUrl: '', types: ['water'] },
];
const entry = (pokemonName: string, pokemonId: number, nominatedBy: string): ClosedListEntry => ({
  id: `c-${pokemonName}`, pokemonId, pokemonName, nominatedBy, sprite: '', tier: 'C',
});
const PENDING: DraftStatus = { id: 'd1', status: 'PENDING', turnOrder: [], currentTurn: null, currentRound: 0, picks: [] };

function renderPage() {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={['/leagues/l1/pool']}>
        <Routes>
          <Route path="/leagues/:leagueId/pool" element={<PoolPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('PoolPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ username: 'ash' });
    api.getAvailablePokemons.mockResolvedValue(AVAILABLE);
    api.getClosedList.mockResolvedValue([entry('pikachu', 25, 'misty'), entry('squirtle', 7, 'ash')]);
    api.getDraftStatus.mockResolvedValue(null);
    api.nominatePokemon.mockResolvedValue(undefined);
    api.denominatePokemon.mockResolvedValue(undefined);
  });

  it('se nomina con el teclado', async () => {
    const user = userEvent.setup();
    renderPage();

    const bulbasaur = await screen.findByRole('button', { name: 'Nominar Bulbasaur (Planta, Veneno)' });
    bulbasaur.focus();
    await user.keyboard('{Enter}');

    await waitFor(() => expect(api.nominatePokemon).toHaveBeenCalledWith('l1', 'bulbasaur'));
  });

  it('lo tuyo se quita; lo de otro dice de quién es y no hace nada', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: /^Quitar Squirtle/ }));
    await waitFor(() => expect(api.denominatePokemon).toHaveBeenCalledWith('l1', 'squirtle'));

    const pikachu = screen.getByRole('button', { name: 'Pikachu, nominado por misty (Eléctrico)' });
    expect(pikachu).toHaveAttribute('aria-disabled', 'true');
    await user.click(pikachu);
    expect(api.nominatePokemon).not.toHaveBeenCalled();
    expect(screen.getByText('De misty')).toBeInTheDocument();
  });

  it('muestra los tipos en español y filtra por tipo', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole('button', { name: /Bulbasaur/ });
    expect(screen.getAllByText('Planta').length).toBeGreaterThan(0);

    await user.click(screen.getByRole('button', { name: 'Agua' }));

    expect(screen.getByRole('button', { name: /Psyduck/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Squirtle/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Bulbasaur/ })).not.toBeInTheDocument();
  });

  it('sin tipos en la lista (backend anterior) no enseña el filtro por tipo', async () => {
    api.getAvailablePokemons.mockResolvedValue(AVAILABLE.map(({ id, name, spriteUrl }) => ({ id, name, spriteUrl })));
    renderPage();
    await screen.findByRole('button', { name: /Bulbasaur/ });

    expect(screen.queryByRole('group', { name: 'Tipo' })).not.toBeInTheDocument();
    // Bulbasaur no está nominado: sin tipos en la lista, va sin chips
    expect(screen.queryByText('Planta')).not.toBeInTheDocument();
  });

  it('con el draft en preparación las nominaciones están cerradas', async () => {
    api.getDraftStatus.mockResolvedValue(PENDING);
    renderPage();
    expect(await screen.findByText('Nominaciones cerradas: se está preparando el draft')).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'Bulbasaur, nominaciones cerradas (Planta, Veneno)' }))
      .toHaveAttribute('aria-disabled', 'true');
  });

  it('con las nominaciones cerradas no se puede nominar', async () => {
    api.getDraftStatus.mockResolvedValue({ ...PENDING, status: 'IN_PROGRESS' });
    renderPage();

    expect(await screen.findByRole('button', { name: 'Bulbasaur, nominaciones cerradas (Planta, Veneno)' }))
      .toHaveAttribute('aria-disabled', 'true');
  });

  it('con el draft cancelado se puede volver a nominar y no salen los tiers', async () => {
    const user = userEvent.setup();
    api.getDraftStatus.mockResolvedValue({ ...PENDING, status: 'CANCELLED' });
    renderPage();

    expect(await screen.findByText('El draft se canceló: las nominaciones vuelven a estar abiertas.')).toBeInTheDocument();
    await user.click(await screen.findByRole('button', { name: 'Nominar Bulbasaur (Planta, Veneno)' }));
    await waitFor(() => expect(api.nominatePokemon).toHaveBeenCalledWith('l1', 'bulbasaur'));
    // Las entradas traen tier 'C' del draft cancelado: no se pinta
    expect(screen.queryByText('C')).not.toBeInTheDocument();
  });

  it('con el draft en marcha sí salen los tiers', async () => {
    api.getDraftStatus.mockResolvedValue({ ...PENDING, status: 'IN_PROGRESS' });
    renderPage();
    await screen.findByRole('button', { name: /^Pikachu/ });
    expect(screen.getAllByText('C').length).toBeGreaterThan(0);
  });
});
