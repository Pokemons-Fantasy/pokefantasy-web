import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import DraftPage from './DraftPage';
import { useAuthStore } from '../store/authStore';
import * as leaguesApi from '../api/leagues';
import * as pokemonsApi from '../api/pokemons';
import type { DraftPick, DraftStatus } from '../api/pokemons';

vi.mock('../hooks/useLayoutMode', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../hooks/useLayoutMode')>()),
  useLayoutMode: () => 'mobile',
}));
vi.mock('../api/leagues', async (importOriginal) => ({
  ...(await importOriginal<typeof leaguesApi>()),
  getLeagueDetail: vi.fn(),
  getLeagueSettings: vi.fn(),
}));
vi.mock('../api/pokemons', async (importOriginal) => ({
  ...(await importOriginal<typeof pokemonsApi>()),
  getDraftStatus: vi.fn(),
  getClosedList: vi.fn(),
  cancelDraft: vi.fn(),
}));

class FakeEventSource {
  static CLOSED = 2;
  readyState = 1;
  addEventListener() {}
  close() {}
}

const CONFIG = { budget: 300, priceS: 200, priceA: 150, priceB: 100, priceC: 60, priceD: 30, snake: false };
const entry = (id: string, pokemonName: string, tier: 'S' | 'D') => ({
  id, pokemonId: 1, pokemonName, nominatedBy: 'ash', sprite: '', tier,
});
const pick = (username: string, pokemonName: string, round: number): DraftPick => ({
  username, pokemonName, pokemonId: 1, round, pickedAt: '2026-09-01T10:00:00Z', price: 30,
});
const draft = (overrides: Partial<DraftStatus>): DraftStatus => ({
  id: 'd1', status: 'IN_PROGRESS', turnOrder: ['ash', 'brock'], currentTurn: 'ash', currentRound: 1,
  picks: [], draftHistory: [], config: CONFIG, budgets: { ash: 300, brock: 300 }, ...overrides,
});

function renderAt(path = '/leagues/l1/draft') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = createMemoryRouter([{ path: '/leagues/:leagueId/draft', element: <DraftPage /> }], { initialEntries: [path] });
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return router;
}

const sections = () => screen.findByRole('tablist', { name: 'Secciones del draft' });

describe('DraftPage en móvil', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('EventSource', FakeEventSource);
    useAuthStore.setState({ username: 'ash' });
    vi.mocked(leaguesApi.getLeagueDetail).mockResolvedValue({
      id: 'l1', name: 'Liga', createdBy: 'ash', status: 'SETUP',
      members: [{ username: 'ash', leagueRole: 'ADMIN' }, { username: 'brock', leagueRole: 'USER' }],
    });
    vi.mocked(leaguesApi.getLeagueSettings).mockResolvedValue({
      coinsPerWin: 100, coinsPerLoss: 50, priceTierS: 10, priceTierA: 5, priceTierB: 3, priceTierC: 2, priceTierD: 1,
      tierPctS: 20, tierPctA: 20, tierPctB: 20, tierPctC: 20, tierPctD: 20, maxTeamSize: 2,
    });
    vi.mocked(pokemonsApi.getClosedList).mockResolvedValue([entry('e1', 'mew', 'S'), entry('e2', 'abra', 'D')]);
    vi.mocked(pokemonsApi.getDraftStatus).mockResolvedValue(draft({}));
  });

  it('en tu turno: barra "Te toca", Elegir por defecto y elegir abre la confirmación', async () => {
    renderAt();
    const bar = (await screen.findAllByRole('status')).find((el) => /Te toca/.test(el.textContent ?? ''));
    expect(bar).toBeDefined();
    const tabs = await sections();
    expect(within(tabs).getByRole('tab', { name: 'Elegir' })).toHaveAttribute('aria-selected', 'true');
    await userEvent.click(await screen.findByRole('button', { name: 'Abra, 30 monedas' }));
    expect(screen.getByRole('alertdialog', { name: '¿Confirmar pick?' })).toBeInTheDocument();
  });

  it('Tablero va a la URL sin historial y la barra ofrece volver a Elegir', async () => {
    const router = renderAt();
    await userEvent.click(within(await sections()).getByRole('tab', { name: 'Tablero' }));
    expect(router.state.location.search).toBe('?vista=tablero');
    expect(router.state.historyAction).toBe('REPLACE');
    expect(screen.getByRole('tablist', { name: 'Jugadores' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Elegir' }));
    expect(router.state.location.search).toBe('?vista=elegir');
  });

  it('turno de otro: la barra lo dice y puedes ir mirando el pool', async () => {
    vi.mocked(pokemonsApi.getDraftStatus).mockResolvedValue(draft({ currentTurn: 'brock' }));
    renderAt();
    const bars = await screen.findAllByRole('status');
    expect(bars.some((el) => /Turno de brock/.test(el.textContent ?? ''))).toBe(true);
    expect(within(await sections()).getByRole('tab', { name: 'Elegir' })).toHaveAttribute('aria-selected', 'true');
  });

  it('si tu draft ha terminado, la barra lo dice y abre el Tablero', async () => {
    vi.mocked(pokemonsApi.getClosedList).mockResolvedValue([entry('e1', 'mew', 'S')]);
    vi.mocked(pokemonsApi.getDraftStatus).mockResolvedValue(draft({ currentTurn: 'brock', budgets: { ash: 20, brock: 300 } }));
    renderAt();
    const bars = await screen.findAllByRole('status');
    expect(bars.some((el) => /Tu draft ha terminado/.test(el.textContent ?? ''))).toBe(true);
    expect(within(await sections()).getByRole('tab', { name: 'Tablero' })).toHaveAttribute('aria-selected', 'true');
  });

  it('si no juegas, abre el Tablero y no habla de tus monedas', async () => {
    useAuthStore.setState({ username: 'oak' });
    renderAt();
    expect(within(await sections()).getByRole('tab', { name: 'Tablero' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.queryByText(/Te quedan/)).not.toBeInTheDocument();
  });

  it('con el draft terminado, sin barra ni pestañas: el tablero por jugador', async () => {
    vi.mocked(pokemonsApi.getDraftStatus).mockResolvedValue(draft({
      status: 'COMPLETED', currentTurn: null, draftHistory: [pick('ash', 'abra', 1)],
    }));
    renderAt();
    expect(await screen.findByRole('tablist', { name: 'Jugadores' })).toBeInTheDocument();
    expect(screen.queryByRole('tablist', { name: 'Secciones del draft' })).not.toBeInTheDocument();
    expect(screen.queryByText(/Te toca|Turno de/)).not.toBeInTheDocument();
  });

  it('con el draft cancelado avisa de que esos picks no cuentan', async () => {
    vi.mocked(pokemonsApi.getDraftStatus).mockResolvedValue(draft({
      status: 'CANCELLED', currentTurn: null, draftHistory: [pick('ash', 'abra', 1)],
    }));
    renderAt();
    expect(await screen.findByText('El draft se canceló: estos picks no cuentan.')).toBeInTheDocument();
    expect(screen.getByRole('tablist', { name: 'Jugadores' })).toBeInTheDocument();
  });

  it('en preparación se ve como en escritorio', async () => {
    useAuthStore.setState({ username: 'brock' });
    vi.mocked(pokemonsApi.getDraftStatus).mockResolvedValue(draft({ status: 'PENDING', currentTurn: null }));
    renderAt();
    expect(await screen.findByText('El admin está preparando el draft')).toBeInTheDocument();
    expect(screen.queryByRole('tablist', { name: 'Secciones del draft' })).not.toBeInTheDocument();
  });

  it('una vista inventada abre la de por defecto', async () => {
    renderAt('/leagues/l1/draft?vista=xyz');
    expect(within(await sections()).getByRole('tab', { name: 'Elegir' })).toHaveAttribute('aria-selected', 'true');
  });

  it('el admin tiene "Cancelar draft" al final', async () => {
    renderAt();
    await sections();
    expect(screen.getByRole('button', { name: 'Cancelar draft' })).toBeInTheDocument();
  });
});
