import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import TierManagementPage from './TierManagementPage';
import { useAuthStore } from '../store/authStore';
import { useToastStore } from '../store/toastStore';
import * as leaguesApi from '../api/leagues';
import * as pokemonsApi from '../api/pokemons';
import type { ClosedListEntry, DraftStatus, Tier } from '../api/pokemons';

vi.mock('../api/leagues', async (importOriginal) => ({
  ...(await importOriginal<typeof leaguesApi>()),
  getLeagueDetail: vi.fn(),
}));
vi.mock('../api/pokemons', async (importOriginal) => ({
  ...(await importOriginal<typeof pokemonsApi>()),
  getDraftStatus: vi.fn(),
  getClosedList: vi.fn(),
  assignTiers: vi.fn(),
}));

const api = vi.mocked(pokemonsApi);
const DRAFT: DraftStatus = {
  id: 'd1', status: 'COMPLETED', turnOrder: ['ash', 'misty'], currentTurn: null, currentRound: 3, picks: [],
  config: null, budgets: {},
};
const entry = (id: string, pokemonId: number, pokemonName: string, tier: Tier): ClosedListEntry => ({
  id, pokemonId, pokemonName, nominatedBy: 'ash', sprite: '', tier,
});

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = createMemoryRouter([
    { path: '/leagues/:leagueId/tiers', element: <TierManagementPage /> },
    { path: '/leagues/:leagueId', element: <p>Pantalla de la liga</p> },
  ], { initialEntries: ['/leagues/l1/tiers'] });
  render(<QueryClientProvider client={queryClient}><RouterProvider router={router} /></QueryClientProvider>);
}

describe('TierManagementPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ username: 'ash' });
    vi.mocked(leaguesApi.getLeagueDetail).mockResolvedValue({
      id: 'l1', name: 'Liga', createdBy: 'ash', status: 'ACTIVE',
      members: [{ username: 'ash', leagueRole: 'ADMIN' }, { username: 'misty', leagueRole: 'USER' }],
    });
    api.getDraftStatus.mockResolvedValue(DRAFT);
    api.getClosedList.mockResolvedValue([
      entry('e1', 150, 'mewtwo', 'S'), entry('e2', 151, 'mew', 'S'),
      entry('e3', 6, 'charizard', 'A'), entry('e4', 63, 'abra', 'B'),
    ]);
    api.assignTiers.mockResolvedValue({
      changes: [
        { pokemonId: 150, pokemonName: 'mewtwo', oldTier: 'S', newTier: 'B' },
        { pokemonId: 151, pokemonName: 'mew', oldTier: 'S', newTier: 'B' },
      ],
    });
    useToastStore.setState({ toasts: [] });
  });

  it('mueve varios Pokémon a la vez, avisa con un toast y recarga el pool', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole('button', { name: 'Mewtwo, tier S' }));
    await user.click(screen.getByRole('button', { name: 'Mew, tier S' }));

    await user.click(screen.getByRole('button', { name: 'Mover 2 a B' }));
    await waitFor(() => expect(api.assignTiers).toHaveBeenCalledWith('l1', ['e1', 'e2'], 'B'));

    await waitFor(() => expect(useToastStore.getState().toasts.map((t) => t.message)).toContain('2 Pokémon movidos a B'));
    expect(api.getClosedList).toHaveBeenCalledTimes(2);
  });

  it('muestra los conteos por tier sin precios', async () => {
    renderPage();
    expect(await screen.findByRole('tab', { name: 'S · 2' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'A · 1' })).toBeInTheDocument();
  });

  it('no deja ajustar con el draft sin terminar', async () => {
    api.getDraftStatus.mockResolvedValue({ ...DRAFT, status: 'IN_PROGRESS' });
    renderPage();
    expect(await screen.findByText('El draft debe estar completado para ajustar tiers.')).toBeInTheDocument();
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
  });

  it('saca a quien no es admin', async () => {
    useAuthStore.setState({ username: 'misty' });
    renderPage();
    expect(await screen.findByText('Pantalla de la liga')).toBeInTheDocument();
  });
});
