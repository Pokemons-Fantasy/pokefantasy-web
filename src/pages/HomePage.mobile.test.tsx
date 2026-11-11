import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes, useParams } from 'react-router-dom';
import HomePage from './HomePage';
import { useAuthStore } from '../store/authStore';
import * as leaguesApi from '../api/leagues';
import * as tradesApi from '../api/trades';
import type { League } from '../api/leagues';
import { setLastLeague } from '../utils/lastLeague';

vi.mock('../hooks/useLayoutMode', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../hooks/useLayoutMode')>()),
  useLayoutMode: () => 'mobile',
}));
vi.mock('../api/leagues', async (importOriginal) => ({
  ...(await importOriginal<typeof leaguesApi>()),
  getMyLeagues: vi.fn(),
  getSchedule: vi.fn(),
}));
vi.mock('../api/trades', async (importOriginal) => ({
  ...(await importOriginal<typeof tradesApi>()),
  getMyPendingTrades: vi.fn(),
}));

const getMyLeagues = vi.mocked(leaguesApi.getMyLeagues);
const league = (id: string): League =>
  ({ id, name: `Liga ${id}`, createdBy: 'ash', memberCount: 2, status: 'SETUP', draftStatus: 'COMPLETED' });

function LeagueScreen() {
  return <p>{`liga ${useParams().leagueId}`}</p>;
}

function renderHome() {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/leagues" element={<p>mis ligas</p>} />
          <Route path="/leagues/:leagueId" element={<LeagueScreen />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('HomePage en móvil', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    useAuthStore.setState({ username: 'ash' });
    vi.mocked(tradesApi.getMyPendingTrades).mockResolvedValue([]);
  });

  it('lleva a la última liga abierta si sigues en ella', async () => {
    setLastLeague('L1');
    getMyLeagues.mockResolvedValue([league('L1'), league('L2')]);
    renderHome();
    expect(await screen.findByText('liga L1')).toBeInTheDocument();
  });

  it('si ya no estás en la última liga, lleva a Mis ligas', async () => {
    setLastLeague('L9');
    getMyLeagues.mockResolvedValue([league('L1')]);
    renderHome();
    expect(await screen.findByText('mis ligas')).toBeInTheDocument();
  });

  it('sin última liga, lleva a Mis ligas', async () => {
    getMyLeagues.mockResolvedValue([league('L1')]);
    renderHome();
    expect(await screen.findByText('mis ligas')).toBeInTheDocument();
  });

  it('si falla la carga de tus ligas, lleva a Mis ligas', async () => {
    setLastLeague('L1');
    getMyLeagues.mockRejectedValue(new Error('sin red'));
    renderHome();
    expect(await screen.findByText('mis ligas')).toBeInTheDocument();
  });

  it('mientras carga tus ligas no muestra la portada ni redirige', () => {
    setLastLeague('L1');
    getMyLeagues.mockReturnValue(new Promise(() => {}));
    renderHome();
    expect(screen.queryByText(/Hola,/)).not.toBeInTheDocument();
    expect(screen.queryByText('liga L1')).not.toBeInTheDocument();
    expect(screen.queryByText('mis ligas')).not.toBeInTheDocument();
    expect(document.querySelector('.skeleton')).toBeInTheDocument();
  });
});
