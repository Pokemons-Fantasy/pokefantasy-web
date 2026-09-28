import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ActivityPage from './ActivityPage';
import { useAuthStore } from '../store/authStore';
import * as activityApi from '../api/activity';
import * as pokemonsApi from '../api/pokemons';
import type { ActivityEvent } from '../api/activity';

vi.mock('../api/activity', async (importOriginal) => ({
  ...(await importOriginal<typeof activityApi>()),
  getActivityFeed: vi.fn(),
}));
vi.mock('../api/pokemons', async (importOriginal) => ({
  ...(await importOriginal<typeof pokemonsApi>()),
  getClosedList: vi.fn(),
}));
const feed = vi.mocked(activityApi.getActivityFeed);
const closedList = vi.mocked(pokemonsApi.getClosedList);

const hoursAgo = (h: number) => new Date(Date.now() - h * 3_600_000).toISOString();
const EVENTS: ActivityEvent[] = [
  { id: 'e1', type: 'STEAL', actorUsername: 'brock', targetUsername: 'misty', pokemonName: 'staryu',
    coinsAmount: 1, createdAt: hoursAgo(0.1) },
  { id: 'e2', type: 'MATCH_RESULT', actorUsername: 'ash', targetUsername: 'may', roundNumber: 3,
    createdAt: hoursAgo(0.2) },
];

function renderPage() {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={['/leagues/l1/activity']}>
        <Routes>
          <Route path="/leagues/:leagueId/activity" element={<ActivityPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('ActivityPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    useAuthStore.setState({ username: 'ash' });
    feed.mockResolvedValue({ events: EVENTS, page: 0, totalPages: 1, hasMore: false });
    closedList.mockResolvedValue([
      { id: 'c1', pokemonId: 121, pokemonName: 'staryu', nominatedBy: 'misty', sprite: '' },
    ]);
  });

  it('pide el feed sin monedas y lo agrupa por día con los nombres resaltados', async () => {
    renderPage();

    const hoy = await screen.findByRole('region', { name: 'Hoy' });
    expect(within(hoy).getByText('Staryu').tagName).toBe('STRONG');
    expect(hoy).toHaveTextContent('brock robó a Staryu de misty · 1 moneda');
    expect(hoy).toHaveTextContent('ash ganó a may · jornada 3');

    const types = feed.mock.calls[0][2]?.types ?? [];
    expect(types).toContain('STEAL');
    expect(types).not.toContain('COIN_EARNED');
    expect(feed.mock.calls[0][2]?.username).toBeUndefined();
  });

  it('muestra el sprite del Pokémon a partir del pool de la liga', async () => {
    const { container } = renderPage();
    await screen.findByRole('region', { name: 'Hoy' });
    await waitFor(() => expect(container.querySelector('img[src$="/121.png"]')).not.toBeNull());
  });

  it('los filtros piden al servidor solo sus tipos', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole('region', { name: 'Hoy' });

    const robos = screen.getByRole('button', { name: 'Robos' });
    expect(robos).toHaveAttribute('aria-pressed', 'false');
    await user.click(robos);

    expect(robos).toHaveAttribute('aria-pressed', 'true');
    await waitFor(() => expect(feed).toHaveBeenLastCalledWith('l1', 0, { username: undefined, types: ['STEAL'] }));
  });

  it('"Solo lo mío" filtra por tu usuario', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole('region', { name: 'Hoy' });

    await user.click(screen.getByRole('button', { name: 'Solo lo mío' }));

    await waitFor(() => expect(feed).toHaveBeenLastCalledWith('l1', 0, expect.objectContaining({ username: 'ash' })));
  });

  it('separa lo nuevo desde tu última visita', async () => {
    localStorage.setItem('pf:activity-last-seen:ash:l1', EVENTS[1].createdAt);
    renderPage();

    expect(await screen.findByText('Tu última visita')).toBeInTheDocument();
  });

  it('la última visita es de cada usuario: la de otra cuenta en este navegador no cuenta', async () => {
    localStorage.setItem('pf:activity-last-seen:misty:l1', EVENTS[1].createdAt);
    renderPage();

    await screen.findByRole('region', { name: 'Hoy' });
    expect(screen.queryByText('Tu última visita')).not.toBeInTheDocument();
  });
});
