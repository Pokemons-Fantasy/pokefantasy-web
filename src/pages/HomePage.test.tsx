import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import HomePage from './HomePage';
import { useAuthStore } from '../store/authStore';
import * as leaguesApi from '../api/leagues';
import * as tradesApi from '../api/trades';
import type { League } from '../api/leagues';

vi.mock('../api/leagues', async (importOriginal) => ({
  ...(await importOriginal<typeof leaguesApi>()),
  getMyLeagues: vi.fn(),
}));
vi.mock('../api/trades', async (importOriginal) => ({
  ...(await importOriginal<typeof tradesApi>()),
  getMyPendingTrades: vi.fn(),
}));

const league = (id: string, draftStatus: League['draftStatus']): League =>
  ({ id, name: `Liga ${id}`, createdBy: 'ash', memberCount: 2, status: 'SETUP', draftStatus });

function renderHome() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('HomePage', () => {
  beforeEach(() => {
    useAuthStore.setState({ username: 'ash' });
    vi.mocked(tradesApi.getMyPendingTrades).mockResolvedValue([]);
  });

  it('la tarjeta Mis ligas es un enlace a /leagues', async () => {
    vi.mocked(leaguesApi.getMyLeagues).mockResolvedValue([]);
    renderHome();
    const link = await screen.findByRole('link', { name: /Mis ligas/ });
    expect(link).toHaveAttribute('href', '/leagues');
  });

  it('con una liga en temporada, la tarjeta destacada enlaza a su calendario', async () => {
    vi.mocked(leaguesApi.getMyLeagues).mockResolvedValue([league('l1', 'COMPLETED')]);
    renderHome();
    const link = await screen.findByRole('link', { name: /Temporada en curso/ });
    expect(link).toHaveAttribute('href', '/leagues/l1/schedule');
  });

  it('con varias ligas en la misma fase, la tarjeta destacada enlaza a la lista', async () => {
    vi.mocked(leaguesApi.getMyLeagues).mockResolvedValue([league('l1', 'PENDING'), league('l2', null)]);
    renderHome();
    const link = await screen.findByRole('link', { name: /Continuar setup/ });
    expect(link).toHaveAttribute('href', '/leagues');
  });
});
