import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import TeamsPage from './TeamsPage';
import { useAuthStore } from '../store/authStore';
import * as pokemonsApi from '../api/pokemons';
import * as leaguesApi from '../api/leagues';
import * as tradesApi from '../api/trades';
import type { DraftStatus, ClosedListEntry, BenchEntry } from '../api/pokemons';
import type { ScheduleResponse, LeagueSettings, CoinBalanceResponse } from '../api/leagues';

vi.mock('../api/pokemons', async (importOriginal) => ({
  ...(await importOriginal<typeof pokemonsApi>()),
  getDraftStatus: vi.fn(),
  getBench: vi.fn(),
  getClosedList: vi.fn(),
  swapWithBench: vi.fn(),
  buyFromBench: vi.fn(),
  stealPokemon: vi.fn(),
  setStealPrice: vi.fn(),
  releasePokemon: vi.fn(),
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

const mockedDraftStatus = vi.mocked(pokemonsApi.getDraftStatus);
const mockedBench = vi.mocked(pokemonsApi.getBench);
const mockedClosedList = vi.mocked(pokemonsApi.getClosedList);
const mockedCoinBalance = vi.mocked(leaguesApi.getMyCoinBalance);
const mockedSchedule = vi.mocked(leaguesApi.getSchedule);
const mockedLeagueSettings = vi.mocked(leaguesApi.getLeagueSettings);
const mockedTrades = vi.mocked(tradesApi.getTrades);

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

const OPEN_SCHEDULE: ScheduleResponse = {
  leagueId: 'league-1', jornadas: [], stealWindowOpen: true, swapWindowOpen: true,
};

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/leagues/league-1/teams']}>
        <Routes>
          <Route path="/leagues/:leagueId/teams" element={<TeamsPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('TeamsPage', () => {
  beforeEach(() => {
    useAuthStore.setState({ username: 'ash' });
    mockedDraftStatus.mockResolvedValue(DRAFT);
    mockedBench.mockResolvedValue([]);
    mockedClosedList.mockResolvedValue(CLOSED_LIST);
    mockedCoinBalance.mockResolvedValue({ coins: 1000 } as CoinBalanceResponse);
    mockedLeagueSettings.mockResolvedValue(SETTINGS);
    mockedSchedule.mockResolvedValue(OPEN_SCHEDULE);
    mockedTrades.mockResolvedValue([]);
  });

  it('derives and renders teams from draft.picks — the critical business rule', async () => {
    renderPage();

    expect(await screen.findByText('pikachu')).toBeInTheDocument();
    expect(await screen.findByText('onix')).toBeInTheDocument();
    expect(screen.getByText('Tu equipo')).toBeInTheDocument();
    expect(screen.getByText('brock')).toBeInTheDocument();
  });

  it('clicking an unlocked rival pokemon during the steal window opens the steal action modal', async () => {
    renderPage();
    const onix = await screen.findByText('onix');

    await userEvent.click(onix.closest('.pokemon-card')!);

    expect(await screen.findByText(/Pokémon de/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Robar/ })).toBeInTheDocument();
  });

  it('choosing "Proponer intercambio" from the rival action modal opens the propose-trade modal', async () => {
    renderPage();
    const onix = await screen.findByText('onix');
    await userEvent.click(onix.closest('.pokemon-card')!);
    await screen.findByText(/Pokémon de/);

    await userEvent.click(screen.getByRole('button', { name: /Proponer intercambio/ }));

    expect(await screen.findByRole('heading', { name: 'Proponer intercambio' })).toBeInTheDocument();
  });

  it('when the steal window is closed, clicking a rival pokemon goes straight to propose-trade', async () => {
    mockedSchedule.mockResolvedValue({ ...OPEN_SCHEDULE, stealWindowOpen: false });
    renderPage();
    const onix = await screen.findByText('onix');

    await userEvent.click(onix.closest('.pokemon-card')!);

    expect(await screen.findByRole('heading', { name: 'Proponer intercambio' })).toBeInTheDocument();
  });

  it('filtering by tier hides non-matching rival pokemon', async () => {
    renderPage();
    await screen.findByText('onix');

    await userEvent.click(screen.getByRole('button', { name: 'S' }));

    await waitFor(() => expect(screen.queryByText('onix')).not.toBeInTheDocument());
  });

  it('clicking a bench entry opens the bench action modal', async () => {
    const bench: BenchEntry[] = [{ pokemonId: 7, pokemonName: 'squirtle', sprite: '', tier: 'C', price: 100 }];
    mockedBench.mockResolvedValue(bench);
    renderPage();

    const squirtle = await screen.findByText('squirtle');
    await userEvent.click(squirtle.closest('.pokemon-card')!);

    expect(await screen.findByRole('heading', { name: 'Banca' })).toBeInTheDocument();
  });
});
