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
  recordMatchResult: vi.fn(),
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
      { id: 'm3', player1: 'brock', player2: 'ash', winnerUsername: 'ash', status: 'COMPLETED',
        winnerScore: 3, loserScore: 1 },
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
    api.recordMatchResult.mockResolvedValue(undefined);
  });

  it('admin can switch the winner of a completed match', async () => {
    useAuthStore.setState({ username: 'ash' });
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: 'Corregir resultado ash vs misty' }));
    await user.click(screen.getByRole('button', { name: '✓ Ganó misty' }));

    await waitFor(() => expect(api.correctMatchResult).toHaveBeenCalledWith('league-1', 'm1', 'misty', null));
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
    await screen.findAllByText('brock');
    expect(screen.queryByRole('button', { name: /Corregir resultado/ })).not.toBeInTheDocument();
  });
});

describe('SchedulePage — marcador', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ username: 'ash' });
    api.getLeagueDetail.mockResolvedValue(LEAGUE);
    api.getSchedule.mockResolvedValue(SCHEDULE);
    api.getMyCoinBalance.mockResolvedValue({ coins: 100 });
    api.correctMatchResult.mockResolvedValue(undefined);
    api.recordMatchResult.mockResolvedValue(undefined);
  });

  it('shows the score in player order instead of FIN', async () => {
    renderPage();
    // m3: brock vs ash, ganó ash 3–1 → "1–3"
    expect(await screen.findByText('1–3')).toBeInTheDocument();
    expect(screen.getByText('FIN')).toBeInTheDocument(); // m1, sin marcador
  });

  it('records a result with score', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: '▶ Resultado' }));
    await user.type(screen.getByLabelText('Marcador del ganador'), '2');
    await user.type(screen.getByLabelText('Marcador del perdedor'), '0');
    await user.click(screen.getByRole('button', { name: '✓ misty' }));

    await waitFor(() => expect(api.recordMatchResult).toHaveBeenCalledWith(
      'league-1', 'm2', 'misty', { winnerScore: 2, loserScore: 0 }));
  });

  it('blocks an invalid score', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: '▶ Resultado' }));
    await user.type(screen.getByLabelText('Marcador del ganador'), '1');
    await user.type(screen.getByLabelText('Marcador del perdedor'), '2');

    expect(screen.getByRole('alert')).toHaveTextContent('El ganador debe tener más que el perdedor.');
    expect(screen.getByRole('button', { name: '✓ misty' })).toBeDisabled();
  });

  it('corrects only the score, keeping the winner', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: 'Corregir resultado brock vs ash' }));
    const saveScore = screen.getByRole('button', { name: '✓ Guardar marcador' });
    expect(screen.getByLabelText('Marcador del ganador')).toHaveValue(3);
    expect(saveScore).toBeDisabled(); // sin cambios

    await user.clear(screen.getByLabelText('Marcador del perdedor'));
    await user.type(screen.getByLabelText('Marcador del perdedor'), '2');
    await user.click(saveScore);

    await waitFor(() => expect(api.correctMatchResult).toHaveBeenCalledWith(
      'league-1', 'm3', 'ash', { winnerScore: 3, loserScore: 2 }));
  });
});
