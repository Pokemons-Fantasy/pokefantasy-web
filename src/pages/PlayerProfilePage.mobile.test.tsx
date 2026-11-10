import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import PlayerProfilePage from './PlayerProfilePage';
import { useLayoutMode } from '../hooks/useLayoutMode';
import * as leaguesApi from '../api/leagues';
import * as pokemonsApi from '../api/pokemons';
import * as activityApi from '../api/activity';
import type { ActivityEvent } from '../api/activity';

vi.mock('../hooks/useLayoutMode', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../hooks/useLayoutMode')>()),
  useLayoutMode: vi.fn(() => 'mobile'),
}));
vi.mock('../api/leagues', async (importOriginal) => ({
  ...(await importOriginal<typeof leaguesApi>()),
  getLeagueDetail: vi.fn(),
  getStandings: vi.fn(),
}));
vi.mock('../api/pokemons', async (importOriginal) => ({
  ...(await importOriginal<typeof pokemonsApi>()),
  getDraftStatus: vi.fn(),
  getClosedList: vi.fn(),
}));
vi.mock('../api/activity', async (importOriginal) => ({
  ...(await importOriginal<typeof activityApi>()),
  getActivityFeed: vi.fn(),
}));

const earned = (n: number): ActivityEvent => ({
  id: `e${n}`, type: 'COIN_EARNED', actorUsername: 'brock', coinsAmount: 100, roundNumber: n,
  createdAt: new Date(Date.now() - n * 3_600_000).toISOString(),
});
const feed = (count: number, hasMore = false) =>
  ({ events: Array.from({ length: count }, (_, i) => earned(i + 1)), hasMore, page: 0, totalPages: hasMore ? 2 : 1 });

function renderPage() {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={['/leagues/l1/players/brock']}>
        <Routes>
          <Route path="/leagues/:leagueId/players/:username" element={<PlayerProfilePage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const coinRows = () => screen.getAllByText(/^\+100 jornada/);

describe('PlayerProfilePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useLayoutMode).mockReturnValue('mobile');
    vi.mocked(leaguesApi.getLeagueDetail).mockResolvedValue({
      id: 'l1', name: 'Liga', createdBy: 'ash', status: 'SETUP', members: [{ username: 'brock', leagueRole: 'USER' }],
    });
    vi.mocked(leaguesApi.getStandings).mockResolvedValue([
      { username: 'brock', wins: 5, losses: 1, played: 6, coins: 320, scoreFor: 0, scoreAgainst: 0, scoreDiff: 0 },
    ]);
    vi.mocked(pokemonsApi.getDraftStatus).mockResolvedValue(null);
    vi.mocked(pokemonsApi.getClosedList).mockResolvedValue([]);
    vi.mocked(activityApi.getActivityFeed).mockResolvedValue(feed(8));
  });

  describe('en móvil', () => {
    it('las estadísticas van en una fila con nombres completos para lectores de pantalla', async () => {
      renderPage();
      const stats = await screen.findByRole('list', { name: 'Estadísticas de brock' });
      expect(within(stats).getAllByRole('listitem').map((li) => li.getAttribute('aria-label')))
        .toEqual(['5 victorias', '1 derrotas', '6 jugados', '320 monedas']);
    });

    it('enseña 5 movimientos y "Ver más movimientos" despliega el resto', async () => {
      renderPage();
      await screen.findByText('+100 jornada 1');
      expect(coinRows()).toHaveLength(5);
      const more = screen.getByRole('button', { name: 'Ver más movimientos' });
      expect(more).toHaveAttribute('aria-expanded', 'false');
      await userEvent.click(more);
      expect(coinRows()).toHaveLength(8);
      expect(screen.queryByRole('button', { name: 'Ver más movimientos' })).not.toBeInTheDocument();
    });

    it('con pocos movimientos no hay botón', async () => {
      vi.mocked(activityApi.getActivityFeed).mockResolvedValue(feed(3));
      renderPage();
      await screen.findByText('+100 jornada 1');
      expect(coinRows()).toHaveLength(3);
      expect(screen.queryByRole('button', { name: 'Ver más movimientos' })).not.toBeInTheDocument();
    });

    it('desplegado, "Cargar más" sigue apareciendo si hay más páginas', async () => {
      vi.mocked(activityApi.getActivityFeed).mockResolvedValue(feed(8, true));
      renderPage();
      await userEvent.click(await screen.findByRole('button', { name: 'Ver más movimientos' }));
      expect(screen.getByRole('button', { name: 'Cargar más' })).toBeInTheDocument();
    });
  });

  describe('en escritorio', () => {
    beforeEach(() => vi.mocked(useLayoutMode).mockReturnValue('desktop'));

    it('sigue con las cuatro tarjetas y todo el historial a la vista', async () => {
      renderPage();
      await screen.findByText('+100 jornada 1');
      expect(screen.getByText('Victorias')).toBeInTheDocument();
      expect(screen.getByText('Monedas', { selector: '.stat-pill-label' })).toBeInTheDocument();
      expect(screen.queryByRole('list', { name: 'Estadísticas de brock' })).not.toBeInTheDocument();
      expect(coinRows()).toHaveLength(8);
      expect(screen.queryByRole('button', { name: 'Ver más movimientos' })).not.toBeInTheDocument();
    });
  });
});
