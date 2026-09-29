import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import MyProfilePage from './MyProfilePage';
import { useAuthStore } from '../store/authStore';
import * as authApi from '../api/auth';
import * as leaguesApi from '../api/leagues';
import * as tradesApi from '../api/trades';

vi.mock('../api/auth', async (importOriginal) => ({
  ...(await importOriginal<typeof authApi>()),
  getMe: vi.fn(),
}));
vi.mock('../api/leagues', async (importOriginal) => ({
  ...(await importOriginal<typeof leaguesApi>()),
  getMyLeagues: vi.fn(),
  getSeasonStats: vi.fn(),
}));
vi.mock('../api/trades', async (importOriginal) => ({
  ...(await importOriginal<typeof tradesApi>()),
  getMyPendingTrades: vi.fn(),
}));

describe('MyProfilePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ username: 'ash' });
    vi.mocked(authApi.getMe).mockResolvedValue({ username: 'ash', avatarVersion: null } as Awaited<ReturnType<typeof authApi.getMe>>);
    vi.mocked(tradesApi.getMyPendingTrades).mockResolvedValue([]);
    vi.mocked(leaguesApi.getSeasonStats).mockResolvedValue([]);
    // `status` es el campo obsoleto (siempre SETUP): la fase sale de draftStatus
    vi.mocked(leaguesApi.getMyLeagues).mockResolvedValue([
      { id: 'l1', name: 'Kanto', createdBy: 'ash', memberCount: 8, status: 'SETUP', draftStatus: 'COMPLETED' },
      { id: 'l2', name: 'Johto', createdBy: 'ash', memberCount: 2, status: 'SETUP', draftStatus: null },
    ]);
  });

  it('cada liga muestra su fase según el draft, no el estado obsoleto', async () => {
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <MemoryRouter><MyProfilePage /></MemoryRouter>
      </QueryClientProvider>
    );

    const kanto = (await screen.findByText('Kanto')).closest('.card') as HTMLElement;
    const johto = screen.getByText('Johto').closest('.card') as HTMLElement;
    expect(within(kanto).getByText('Temporada')).toBeInTheDocument();
    expect(within(johto).getByText('En preparación')).toBeInTheDocument();
    expect(screen.queryByText('Configuración')).not.toBeInTheDocument();
  });
});
