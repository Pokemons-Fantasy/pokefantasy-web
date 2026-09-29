import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import DraftSetupPage from './DraftSetupPage';
import { useAuthStore } from '../store/authStore';
import * as leaguesApi from '../api/leagues';
import * as pokemonsApi from '../api/pokemons';
import type { ClosedListEntry, DraftStatus } from '../api/pokemons';

vi.mock('../api/leagues', async (importOriginal) => ({
  ...(await importOriginal<typeof leaguesApi>()),
  getLeagueDetail: vi.fn(),
  getLeagueSettings: vi.fn(),
}));
vi.mock('../api/pokemons', async (importOriginal) => ({
  ...(await importOriginal<typeof pokemonsApi>()),
  getDraftStatus: vi.fn(),
  getClosedList: vi.fn(),
  updateDraftConfig: vi.fn(),
  setDraftPoolTiers: vi.fn(),
  resetDraftPoolTiers: vi.fn(),
  startPreparedDraft: vi.fn(),
  cancelDraft: vi.fn(),
}));

const api = vi.mocked(pokemonsApi);
const CONFIG = { budget: 1000, priceS: 200, priceA: 150, priceB: 100, priceC: 60, priceD: 30, snake: false };
const DRAFT: DraftStatus = {
  id: 'd1', status: 'PENDING', turnOrder: ['ash', 'misty'], currentTurn: null, currentRound: 1, picks: [],
  config: CONFIG, budgets: { ash: 1000, misty: 1000 },
};
const entry = (id: string, pokemonName: string, tier: 'S' | 'D'): ClosedListEntry => ({
  id, pokemonId: 1, pokemonName, nominatedBy: 'ash', sprite: '', tier,
});

function renderPage(queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })) {
  const router = createMemoryRouter([
    { path: '/leagues/:leagueId/draft/setup', element: <DraftSetupPage /> },
    { path: '/leagues/:leagueId/draft', element: <p>Pantalla del draft</p> },
    { path: '/leagues/:leagueId/pool', element: <p>Pantalla del pool</p> },
  ], { initialEntries: ['/leagues/l1/draft/setup'] });
  render(<QueryClientProvider client={queryClient}><RouterProvider router={router} /></QueryClientProvider>);
  return router;
}

describe('DraftSetupPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ username: 'ash' });
    vi.mocked(leaguesApi.getLeagueDetail).mockResolvedValue({
      id: 'l1', name: 'Liga', createdBy: 'ash', status: 'SETUP',
      members: [{ username: 'ash', leagueRole: 'ADMIN' }, { username: 'misty', leagueRole: 'USER' }],
    });
    vi.mocked(leaguesApi.getLeagueSettings).mockResolvedValue({
      coinsPerWin: 100, coinsPerLoss: 50, priceTierS: 0, priceTierA: 0, priceTierB: 0, priceTierC: 0, priceTierD: 0,
      tierPctS: 20, tierPctA: 20, tierPctB: 20, tierPctC: 20, tierPctD: 20, maxTeamSize: 10,
    });
    api.getDraftStatus.mockResolvedValue(DRAFT);
    api.getClosedList.mockResolvedValue([entry('e1', 'mew', 'S'), entry('e2', 'mewtwo', 'S'), entry('e3', 'abra', 'D')]);
    api.updateDraftConfig.mockResolvedValue(undefined);
    api.setDraftPoolTiers.mockResolvedValue(undefined);
    api.startPreparedDraft.mockResolvedValue(undefined);
    api.cancelDraft.mockResolvedValue(undefined);
  });

  it('mueve los Pokémon seleccionados a otro tier', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole('button', { name: 'Mew, tier S, 200 monedas' }));
    await user.click(screen.getByRole('button', { name: 'Mewtwo, tier S, 200 monedas' }));
    await user.click(screen.getByRole('button', { name: 'Mover 2 a A' }));
    await waitFor(() => expect(api.setDraftPoolTiers).toHaveBeenCalledWith('l1', ['e1', 'e2'], 'A'));
  });

  it('guarda presupuesto, precios, snake y orden', async () => {
    const user = userEvent.setup();
    renderPage();
    const budget = await screen.findByLabelText('Presupuesto por jugador');
    await user.clear(budget);
    await user.type(budget, '800');
    await user.click(screen.getByRole('checkbox', { name: /Snake/ }));
    await user.click(screen.getByRole('button', { name: 'Guardar' }));
    await waitFor(() => expect(api.updateDraftConfig).toHaveBeenCalledWith('l1', {
      ...CONFIG, budget: 800, snake: true, turnOrder: ['ash', 'misty'],
    }));
  });

  it('con cambios sin guardar no deja empezar y pide confirmación al salir', async () => {
    const user = userEvent.setup();
    const router = renderPage();
    const budget = await screen.findByLabelText('Presupuesto por jugador');
    await user.clear(budget);
    await user.type(budget, '800');
    expect(screen.getByRole('button', { name: 'Empezar draft' })).toBeDisabled();
    await act(async () => {});
    await act(async () => { await router.navigate('/leagues/l1/pool'); });
    expect(screen.getByText('¿Salir sin guardar?')).toBeInTheDocument();
  });

  it('orden con un miembro nuevo cuenta como cambio sin guardar', async () => {
    vi.mocked(leaguesApi.getLeagueDetail).mockResolvedValue({
      id: 'l1', name: 'Liga', createdBy: 'ash', status: 'SETUP',
      members: [
        { username: 'ash', leagueRole: 'ADMIN' }, { username: 'misty', leagueRole: 'USER' },
        { username: 'brock', leagueRole: 'USER' },
      ],
    });
    renderPage();
    expect(await screen.findByRole('button', { name: 'Empezar draft' })).toBeDisabled();
    expect(screen.getByText('brock')).toBeInTheDocument();
  });

  it('empieza el draft y va a la pantalla del draft', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole('button', { name: 'Empezar draft' }));
    await user.click(screen.getByRole('button', { name: 'Empezar' }));
    await waitFor(() => expect(api.startPreparedDraft).toHaveBeenCalledWith('l1'));
    expect(await screen.findByText('Pantalla del draft')).toBeInTheDocument();
  });

  it('volver a nominaciones descarta la preparación y va al pool', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole('button', { name: 'Volver a nominaciones' }));
    await user.click(screen.getByRole('button', { name: 'Volver' }));
    await waitFor(() => expect(api.cancelDraft).toHaveBeenCalledWith('l1'));
    expect(await screen.findByText('Pantalla del pool')).toBeInTheDocument();
  });

  it('muestra el aviso de cobertura del presupuesto', async () => {
    renderPage();
    expect(await screen.findByText(/Con 1000 monedas llega para 33 Pokémon del tier más barato \(D, 30\)/)).toBeInTheDocument();
  });

  it('con el estado del draft cacheado de antes de preparar espera al refetch y no redirige', async () => {
    // Vienes de Miembros: la caché dice "sin draft" y el refetch trae el draft en preparación.
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    queryClient.setQueryData(['draft-status', 'l1'], null);
    queryClient.setQueryData(['league-detail', 'l1'], {
      id: 'l1', name: 'Liga', createdBy: 'ash', status: 'SETUP',
      members: [{ username: 'ash', leagueRole: 'ADMIN' }, { username: 'misty', leagueRole: 'USER' }],
    });
    renderPage(queryClient);
    expect(await screen.findByRole('heading', { name: 'Preparar draft' })).toBeInTheDocument();
    expect(screen.queryByText('Pantalla del draft')).not.toBeInTheDocument();
  });

  it('un jugador que no es admin va a la pantalla del draft', async () => {
    useAuthStore.setState({ username: 'misty' });
    renderPage();
    expect(await screen.findByText('Pantalla del draft')).toBeInTheDocument();
  });
});
