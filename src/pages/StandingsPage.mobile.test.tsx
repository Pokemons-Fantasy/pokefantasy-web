import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import StandingsPage from './StandingsPage';
import { useAuthStore } from '../store/authStore';
import * as leaguesApi from '../api/leagues';
import type { PlayerStanding } from '../api/leagues';

vi.mock('../hooks/useLayoutMode', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../hooks/useLayoutMode')>()),
  useLayoutMode: () => 'mobile',
}));
vi.mock('../api/leagues', async (importOriginal) => ({
  ...(await importOriginal<typeof leaguesApi>()),
  getStandings: vi.fn(),
  getSchedule: vi.fn(),
}));

const standing = (username: string, wins: number, losses: number, coins: number): PlayerStanding => ({
  username, wins, losses, played: wins + losses, coins, scoreFor: 0, scoreAgainst: 0, scoreDiff: 0,
});

function renderPage() {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={['/leagues/l1/standings']}>
        <Routes>
          <Route path="/leagues/:leagueId/standings" element={<StandingsPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('StandingsPage en móvil', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ username: 'ash' });
    vi.mocked(leaguesApi.getSchedule).mockResolvedValue({ leagueId: 'l1', stealWindowOpen: false, swapWindowOpen: false, jornadas: [] });
    vi.mocked(leaguesApi.getStandings).mockResolvedValue([standing('brock', 2, 0, 200), standing('ash', 1, 1, 150)]);
  });

  it('el título queda solo para lectores de pantalla, sin emoji, y la tabla arriba', async () => {
    renderPage();
    const title = screen.getByRole('heading', { level: 1, name: 'Clasificación' });
    expect(title).toHaveClass('sr-only');
    expect(screen.queryByText(/🏆/)).not.toBeInTheDocument();
    expect(await screen.findByRole('table')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'ash' })).toBeInTheDocument();
  });
});
