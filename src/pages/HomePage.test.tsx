import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import HomePage from './HomePage';
import { useAuthStore } from '../store/authStore';
import * as leaguesApi from '../api/leagues';
import * as pokemonsApi from '../api/pokemons';
import * as tradesApi from '../api/trades';
import type { League, MatchDto, ScheduleResponse } from '../api/leagues';

vi.mock('../api/leagues', async (importOriginal) => ({
  ...(await importOriginal<typeof leaguesApi>()),
  getMyLeagues: vi.fn(),
  getSchedule: vi.fn(),
}));
vi.mock('../api/pokemons', async (importOriginal) => ({
  ...(await importOriginal<typeof pokemonsApi>()),
  getDraftStatus: vi.fn(),
}));
vi.mock('../api/trades', async (importOriginal) => ({
  ...(await importOriginal<typeof tradesApi>()),
  getMyPendingTrades: vi.fn(),
}));

const getMyLeagues = vi.mocked(leaguesApi.getMyLeagues);
const getSchedule = vi.mocked(leaguesApi.getSchedule);
const getDraftStatus = vi.mocked(pokemonsApi.getDraftStatus);

const league = (id: string, draftStatus: League['draftStatus']): League =>
  ({ id, name: `Liga ${id}`, createdBy: 'ash', memberCount: 2, status: 'SETUP', draftStatus });
const played = (player1: string, player2: string, winnerUsername: string): MatchDto =>
  ({ id: `${player1}-${player2}`, player1, player2, winnerUsername, status: 'COMPLETED', winnerScore: 6, loserScore: 0 });
const pending = (player1: string, player2: string): MatchDto =>
  ({ id: `${player1}-${player2}`, player1, player2, status: 'PENDING' });
const schedule = (...rounds: MatchDto[][]): ScheduleResponse => ({
  leagueId: 'l1', stealWindowOpen: true, swapWindowOpen: false,
  jornadas: rounds.map((matches, i) => ({ roundNumber: i + 1, startDate: `2026-10-0${i + 1}`, matches })),
});

function renderHome() {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const cardOf = async (name: string) => (await screen.findByRole('heading', { name })).closest('.home-league') as HTMLElement;

describe('HomePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ username: 'ash' });
    vi.mocked(tradesApi.getMyPendingTrades).mockResolvedValue([]);
  });

  it('una liga en temporada muestra tu rival, tu último resultado y el mercado aunque haya otra en preparación', async () => {
    getMyLeagues.mockResolvedValue([league('prep', 'PENDING'), league('kanto', 'COMPLETED')]);
    getSchedule.mockResolvedValue(schedule([played('ash', 'may', 'ash')], [pending('jessie', 'ash')]));
    renderHome();

    const kanto = await cardOf('Liga kanto');
    expect(await within(kanto).findByText(/Jornada 2 · /)).toBeInTheDocument();
    expect(within(kanto).getByLabelText('Tu partido: ash contra jessie')).toBeInTheDocument();
    expect(within(kanto).getByText('Último: Ganaste a may 6–0')).toBeInTheDocument();
    expect(within(kanto).getByRole('status', { name: 'Estado del mercado' })).toBeInTheDocument();
    expect(within(kanto).getByRole('link', { name: 'Calendario' })).toHaveAttribute('href', '/leagues/kanto/schedule');

    // Más urgente primero: la temporada va antes que la preparación
    const headings = screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent);
    expect(headings).toEqual(['Liga kanto', 'Liga prep']);
    expect(screen.getByRole('link', { name: /Liga prep/ })).toHaveAttribute('href', '/leagues/prep');
  });

  it('si descansas lo dice y apunta tu próximo partido', async () => {
    getMyLeagues.mockResolvedValue([league('kanto', 'COMPLETED')]);
    getSchedule.mockResolvedValue(schedule([played('ash', 'may', 'may')], [pending('brock', 'misty')], [pending('ash', 'brock')]));
    renderHome();

    const kanto = await cardOf('Liga kanto');
    expect(await within(kanto).findByText('Descansas esta jornada · Próximo: brock (jornada 3)')).toBeInTheDocument();
  });

  it('con el draft en curso avisa de que te toca', async () => {
    getMyLeagues.mockResolvedValue([league('johto', 'IN_PROGRESS')]);
    getDraftStatus.mockResolvedValue({
      id: 'd1', status: 'IN_PROGRESS', turnOrder: ['ash', 'misty'], currentTurn: 'ash', currentRound: 1, picks: [],
    });
    renderHome();

    const link = await screen.findByRole('link', { name: /Liga johto/ });
    expect(link).toHaveAttribute('href', '/leagues/johto/draft');
    expect(await within(link).findByText('¡Te toca elegir!')).toBeInTheDocument();
  });

  it('sin ligas da la bienvenida y lleva a Mis ligas', async () => {
    getMyLeagues.mockResolvedValue([]);
    renderHome();

    expect(await screen.findByRole('link', { name: /Crea o únete a una liga/ })).toHaveAttribute('href', '/leagues');
    expect(screen.getByText(/Nomina, draftea y compite/)).toBeInTheDocument();
    expect(screen.queryByText('Tus ligas')).not.toBeInTheDocument();
  });

  it('con más de 4 ligas enseña las 4 más urgentes y "Ver todas"', async () => {
    getMyLeagues.mockResolvedValue(['a', 'b', 'c', 'd', 'e'].map((id) => league(id, null)));
    renderHome();

    expect(await screen.findByRole('link', { name: 'Ver todas (5) →' })).toHaveAttribute('href', '/leagues');
    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(4);
  });
});
