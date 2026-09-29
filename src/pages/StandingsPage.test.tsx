import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import StandingsPage from './StandingsPage';
import { useAuthStore } from '../store/authStore';
import * as leaguesApi from '../api/leagues';
import type { MatchDto, PlayerStanding } from '../api/leagues';

vi.mock('../api/leagues', async (importOriginal) => ({
  ...(await importOriginal<typeof leaguesApi>()),
  getStandings: vi.fn(),
  getSchedule: vi.fn(),
}));
const getStandings = vi.mocked(leaguesApi.getStandings);
const getSchedule = vi.mocked(leaguesApi.getSchedule);

const standing = (username: string, wins: number, losses: number, coins: number, scoreFor = 0, scoreAgainst = 0): PlayerStanding => ({
  username, wins, losses, played: wins + losses, coins, scoreFor, scoreAgainst, scoreDiff: scoreFor - scoreAgainst,
});
const match = (player1: string, player2: string, winnerUsername: string): MatchDto =>
  ({ id: `${player1}-${player2}`, player1, player2, winnerUsername, status: 'COMPLETED' });

function renderPage() {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={['/leagues/l1/standings']}>
        <Routes>
          <Route path="/leagues/:leagueId/standings" element={<StandingsPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

const rowOf = async (username: string) => (await screen.findByRole('link', { name: username })).closest('tr') as HTMLElement;

describe('StandingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ username: 'ash' });
    getSchedule.mockResolvedValue({
      leagueId: 'l1', stealWindowOpen: false, swapWindowOpen: false,
      jornadas: [
        { roundNumber: 1, matches: [match('james', 'ash', 'james'), match('jessie', 'brock', 'jessie')] },
        { roundNumber: 2, matches: [match('ash', 'brock', 'ash'), match('james', 'jessie', 'james')] },
      ],
    });
  });

  it('explica el desempate y resalta las monedas que han decidido el orden', async () => {
    getStandings.mockResolvedValue([
      standing('james', 2, 0, 350), standing('jessie', 1, 1, 300), standing('ash', 1, 1, 200), standing('brock', 0, 2, 100),
    ]);
    renderPage();

    const jessie = await rowOf('jessie');
    expect(within(jessie).getByTitle('Decide el desempate')).toHaveTextContent('300');
    expect(within(await rowOf('james')).queryByTitle('Decide el desempate')).not.toBeInTheDocument();
    expect(screen.getByText(/Con las mismas victorias decide la diferencia de marcador/)).toBeInTheDocument();
    // Sin marcadores no hay columna "Dif"
    expect(screen.queryByTitle('Diferencia de marcador')).not.toBeInTheDocument();
  });

  it('con marcadores muestra "Dif" y resalta la diferencia si es la que decide', async () => {
    getStandings.mockResolvedValue([
      standing('jessie', 1, 1, 100, 5, 2), standing('ash', 1, 1, 900, 3, 3),
    ]);
    renderPage();

    expect(await screen.findByTitle('Diferencia de marcador')).toBeInTheDocument();
    expect(within(await rowOf('jessie')).getByTitle('Decide el desempate')).toHaveTextContent('+3');
    expect(within(await rowOf('ash')).getByText('900')).not.toHaveClass('standing-decisive');
  });

  it('sin empates no hay leyenda', async () => {
    getStandings.mockResolvedValue([standing('james', 2, 0, 350), standing('ash', 1, 1, 200)]);
    renderPage();

    await rowOf('ash');
    expect(screen.queryByText(/Con las mismas victorias/)).not.toBeInTheDocument();
  });

  it('marca tu fila, numera todas las posiciones y muestra la racha', async () => {
    getStandings.mockResolvedValue([standing('james', 2, 0, 350), standing('ash', 1, 1, 200)]);
    renderPage();

    const ash = await rowOf('ash');
    expect(ash).toHaveClass('me');
    expect(within(ash).getByText('Tú')).toBeInTheDocument();
    expect(ash.querySelector('.standing-pos')).toHaveTextContent('2');
    expect(ash.querySelector('.standing-pos')).toHaveClass('top-2');
    expect(within(ash).getByRole('img', { name: 'Últimos partidos: D, V' })).toBeInTheDocument();
    expect(within(await rowOf('james')).getByRole('img', { name: 'Últimos partidos: V, V' })).toBeInTheDocument();
  });
});
