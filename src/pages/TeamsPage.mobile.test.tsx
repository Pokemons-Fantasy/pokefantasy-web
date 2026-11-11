import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import type { InitialEntry } from 'react-router-dom';
import TeamsPage from './TeamsPage';
import { useAuthStore } from '../store/authStore';
import * as pokemonsApi from '../api/pokemons';
import * as leaguesApi from '../api/leagues';
import * as tradesApi from '../api/trades';
import type { DraftStatus, ClosedListEntry, BenchEntry } from '../api/pokemons';
import type { ScheduleResponse, LeagueSettings, CoinBalanceResponse } from '../api/leagues';

vi.mock('../hooks/useLayoutMode', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../hooks/useLayoutMode')>()),
  useLayoutMode: () => 'mobile',
}));
vi.mock('../api/pokemons', async (importOriginal) => ({
  ...(await importOriginal<typeof pokemonsApi>()),
  getDraftStatus: vi.fn(),
  getBench: vi.fn(),
  getClosedList: vi.fn(),
}));
vi.mock('../api/leagues', async (importOriginal) => ({
  ...(await importOriginal<typeof leaguesApi>()),
  getMyCoinBalance: vi.fn(),
  getSchedule: vi.fn(),
  getLeagueSettings: vi.fn(),
}));
vi.mock('../api/trades', async (importOriginal) => ({
  ...(await importOriginal<typeof tradesApi>()),
  getTrades: vi.fn(),
}));
vi.mock('@capacitor/clipboard', () => ({ Clipboard: { write: vi.fn().mockResolvedValue(undefined) } }));
vi.mock('@capacitor/haptics', () => ({ Haptics: { impact: vi.fn() }, ImpactStyle: { Heavy: 'HEAVY', Medium: 'MEDIUM' } }));

const DRAFT: DraftStatus = {
  id: 'draft-1',
  status: 'COMPLETED',
  turnOrder: ['ash', 'brock'],
  currentTurn: null,
  currentRound: 1,
  picks: [
    { username: 'ash', pokemonName: 'pikachu', pokemonId: 25, round: 1, pickedAt: '2026-01-01T00:00:00Z' },
    { username: 'brock', pokemonName: 'onix', pokemonId: 95, round: 1, pickedAt: '2026-01-01T00:00:00Z' },
  ],
};

const CLOSED_LIST: ClosedListEntry[] = [
  { id: '1', pokemonId: 25, pokemonName: 'pikachu', nominatedBy: 'ash', sprite: '', tier: 'A' },
  { id: '2', pokemonId: 95, pokemonName: 'onix', nominatedBy: 'brock', sprite: '', tier: 'B' },
];

const SETTINGS: LeagueSettings = {
  coinsPerWin: 100, coinsPerLoss: 50,
  priceTierS: 500, priceTierA: 300, priceTierB: 200, priceTierC: 100, priceTierD: 50,
  tierPctS: 20, tierPctA: 20, tierPctB: 20, tierPctC: 20, tierPctD: 20,
  maxTeamSize: 20,
};

const SCHEDULE: ScheduleResponse = {
  leagueId: 'league-1', stealWindowOpen: true, swapWindowOpen: true,
  jornadas: [{ roundNumber: 1, startDate: '2026-11-01', matches: [{ id: 'm1', player1: 'ash', player2: 'brock', status: 'PENDING' }] }],
};

const BENCH: BenchEntry[] = [{ pokemonId: 7, pokemonName: 'squirtle', sprite: '', tier: 'C', price: 100 }];

function renderAt(entry: InitialEntry) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = createMemoryRouter(
    [{ path: '/leagues/:leagueId/teams', element: <TeamsPage /> }],
    { initialEntries: [entry] },
  );
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return router;
}

const tabs = () => screen.findByRole('tablist', { name: 'Secciones de Equipos' });

describe('TeamsPage en móvil', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ username: 'ash' });
    vi.mocked(pokemonsApi.getDraftStatus).mockResolvedValue(DRAFT);
    vi.mocked(pokemonsApi.getBench).mockResolvedValue(BENCH);
    vi.mocked(pokemonsApi.getClosedList).mockResolvedValue(CLOSED_LIST);
    vi.mocked(leaguesApi.getMyCoinBalance).mockResolvedValue({ coins: 1000 } as CoinBalanceResponse);
    vi.mocked(leaguesApi.getLeagueSettings).mockResolvedValue(SETTINGS);
    vi.mocked(leaguesApi.getSchedule).mockResolvedValue(SCHEDULE);
    vi.mocked(tradesApi.getTrades).mockResolvedValue([]);
  });

  it('muestra el resumen y, por defecto, tu equipo', async () => {
    renderAt('/leagues/league-1/teams');
    expect(await screen.findByText('Tu partido: vs brock')).toBeInTheDocument();
    expect(screen.getByRole('status', { name: 'Estado del mercado' })).toHaveTextContent('Robos');
    const list = await tabs();
    expect(within(list).getAllByRole('tab').map((t) => t.textContent)).toEqual(['Mi equipo', 'Rivales', 'Banquillo']);
    expect(within(list).getByRole('tab', { name: 'Mi equipo' })).toHaveAttribute('aria-selected', 'true');
    expect(await screen.findByText('pikachu')).toBeInTheDocument();
    expect(screen.queryByText('onix')).not.toBeInTheDocument();
    expect(screen.queryByText('squirtle')).not.toBeInTheDocument();
  });

  it('Rivales va a la URL sin añadir historial y muestra rivales y buscador', async () => {
    const router = renderAt('/leagues/league-1/teams');
    await userEvent.click(within(await tabs()).getByRole('tab', { name: 'Rivales' }));
    expect(router.state.location.search).toBe('?vista=rivales');
    expect(router.state.historyAction).toBe('REPLACE');
    expect(await screen.findByRole('button', { name: /brock/ })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Buscar/)).toBeInTheDocument();
    expect(screen.queryByText('pikachu')).not.toBeInTheDocument();
  });

  it('?vista=banquillo abre el banquillo', async () => {
    renderAt('/leagues/league-1/teams?vista=banquillo');
    expect(await screen.findByText('squirtle')).toBeInTheDocument();
    expect(within(await tabs()).getByRole('tab', { name: 'Banquillo' })).toHaveAttribute('aria-selected', 'true');
  });

  it('una vista desconocida muestra tu equipo', async () => {
    renderAt('/leagues/league-1/teams?vista=xyz');
    expect(within(await tabs()).getByRole('tab', { name: 'Mi equipo' })).toHaveAttribute('aria-selected', 'true');
    expect(await screen.findByText('pikachu')).toBeInTheDocument();
  });

  it('sin equipo propio no hay Mi equipo y la vista es Rivales', async () => {
    useAuthStore.setState({ username: 'misty' });
    renderAt('/leagues/league-1/teams');
    const list = await tabs();
    expect(within(list).getAllByRole('tab').map((t) => t.textContent)).toEqual(['Rivales', 'Banquillo']);
    expect(within(list).getByRole('tab', { name: 'Rivales' })).toHaveAttribute('aria-selected', 'true');
  });

  it('con el draft en curso no hay resumen ni sub-pestañas', async () => {
    vi.mocked(pokemonsApi.getDraftStatus).mockResolvedValue({ ...DRAFT, status: 'IN_PROGRESS' });
    renderAt('/leagues/league-1/teams');
    expect(await screen.findByText('pikachu')).toBeInTheDocument();
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
    expect(screen.queryByText(/Tu partido/)).not.toBeInTheDocument();
  });

  it('sin calendario sigue habiendo acceso a Intercambios y a tus monedas', async () => {
    vi.mocked(leaguesApi.getSchedule).mockResolvedValue(null as unknown as ScheduleResponse);
    renderAt('/leagues/league-1/teams');
    expect(await screen.findByRole('button', { name: 'Intercambios' })).toBeInTheDocument();
    expect(screen.queryByText(/Tu partido/)).not.toBeInTheDocument();
    expect(await screen.findByText(/1000/)).toBeInTheDocument();
  });

  it('llegar con openTrades abre Intercambios', async () => {
    renderAt({ pathname: '/leagues/league-1/teams', state: { openTrades: true } });
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });

  it('un Pokémon rival con los robos abiertos abre el modal de acción', async () => {
    renderAt('/leagues/league-1/teams?vista=rivales');
    await userEvent.click(await screen.findByRole('button', { name: /brock/ }));
    const onix = await screen.findByText('onix');
    await userEvent.click(onix.closest('.pokemon-card')!);
    expect(await screen.findByRole('button', { name: /Robar/ })).toBeInTheDocument();
  });
});
