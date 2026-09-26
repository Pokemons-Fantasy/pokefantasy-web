import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import SchedulePage from './SchedulePage';
import { useAuthStore } from '../store/authStore';
import * as leaguesApi from '../api/leagues';
import type { LeagueDetail, ScheduleResponse } from '../api/leagues';

vi.mock('../api/leagues', async (importOriginal) => ({
  ...(await importOriginal<typeof leaguesApi>()),
  getLeagueDetail: vi.fn(),
  getSchedule: vi.fn(),
  getMyCoinBalance: vi.fn(),
  correctMatchResult: vi.fn(),
  revertMatchResult: vi.fn(),
}));
const api = vi.mocked(leaguesApi);

const LEAGUE: LeagueDetail = {
  id: 'league-1',
  name: 'Liga Test',
  createdBy: 'ash',
  status: 'ACTIVE',
  members: [
    { username: 'ash', leagueRole: 'ADMIN' },
    { username: 'misty', leagueRole: 'USER' },
  ],
};

const SCHEDULE: ScheduleResponse = {
  leagueId: 'league-1',
  stealWindowOpen: false,
  swapWindowOpen: false,
  jornadas: [{
    roundNumber: 1,
    matches: [
      { id: 'm1', player1: 'ash', player2: 'misty', winnerUsername: 'ash', status: 'COMPLETED' },
      { id: 'm2', player1: 'brock', player2: 'misty', status: 'PENDING' },
    ],
  }],
};

function renderPage() {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={['/leagues/league-1/schedule']}>
        <Routes>
          <Route path="/leagues/:leagueId/schedule" element={<SchedulePage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('SchedulePage — corregir resultados', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.getLeagueDetail.mockResolvedValue(LEAGUE);
    api.getSchedule.mockResolvedValue(SCHEDULE);
    api.getMyCoinBalance.mockResolvedValue({ coins: 100 });
    api.correctMatchResult.mockResolvedValue(undefined);
    api.revertMatchResult.mockResolvedValue(undefined);
  });

  it('admin can switch the winner of a completed match', async () => {
    useAuthStore.setState({ username: 'ash' });
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: 'Corregir resultado ash vs misty' }));
    await user.click(screen.getByRole('button', { name: '✓ Ganó misty' }));

    await waitFor(() => expect(api.correctMatchResult).toHaveBeenCalledWith('league-1', 'm1', 'misty'));
    expect(api.revertMatchResult).not.toHaveBeenCalled();
  });

  it('admin can undo a result', async () => {
    useAuthStore.setState({ username: 'ash' });
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: 'Corregir resultado ash vs misty' }));
    await user.click(screen.getByRole('button', { name: '↩ Deshacer resultado' }));

    await waitFor(() => expect(api.revertMatchResult).toHaveBeenCalledWith('league-1', 'm1'));
  });

  it('only completed matches can be corrected, and only by admins', async () => {
    useAuthStore.setState({ username: 'ash' });
    const { unmount } = renderPage();
    await screen.findByRole('button', { name: 'Corregir resultado ash vs misty' });
    expect(screen.queryByRole('button', { name: 'Corregir resultado brock vs misty' })).not.toBeInTheDocument();
    unmount();

    useAuthStore.setState({ username: 'misty' });
    renderPage();
    await screen.findByText('brock');
    expect(screen.queryByRole('button', { name: /Corregir resultado/ })).not.toBeInTheDocument();
  });
});
