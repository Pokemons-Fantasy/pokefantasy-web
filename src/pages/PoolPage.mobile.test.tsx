import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import PoolPage from './PoolPage';
import { useAuthStore } from '../store/authStore';
import * as pokemonsApi from '../api/pokemons';
import type { DraftStatus } from '../api/pokemons';

vi.mock('../hooks/useLayoutMode', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../hooks/useLayoutMode')>()),
  useLayoutMode: () => 'mobile',
}));
vi.mock('../api/pokemons', async (importOriginal) => ({
  ...(await importOriginal<typeof pokemonsApi>()),
  getAvailablePokemons: vi.fn(),
  getClosedList: vi.fn(),
  getDraftStatus: vi.fn(),
  nominatePokemon: vi.fn(),
  denominatePokemon: vi.fn(),
}));
const api = vi.mocked(pokemonsApi);

const PENDING: DraftStatus = { id: 'd1', status: 'PENDING', turnOrder: [], currentTurn: null, currentRound: 0, picks: [] };

function renderPage() {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={['/leagues/l1/pool']}>
        <Routes>
          <Route path="/leagues/:leagueId/pool" element={<PoolPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('PoolPage en móvil', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ username: 'ash' });
    api.getAvailablePokemons.mockResolvedValue([{ id: 7, name: 'squirtle', spriteUrl: '', types: ['water'] }]);
    api.getClosedList.mockResolvedValue([]);
    api.getDraftStatus.mockResolvedValue(PENDING);
  });

  it('el título queda para lectores de pantalla y la fase no se repite (ya está en la app bar)', async () => {
    renderPage();
    expect(screen.getByRole('heading', { level: 1, name: 'Pool de nominaciones' })).toHaveClass('sr-only');
    expect(await screen.findByText('Nominaciones cerradas: se está preparando el draft')).toBeInTheDocument();
    expect(screen.queryByText('Preparando draft')).not.toBeInTheDocument();
  });

  it('el contador de nominaciones sigue a la vista', () => {
    renderPage();
    expect(screen.getByText('Tus nominaciones')).toBeVisible();
    expect(screen.getByText('0/16')).toBeInTheDocument();
  });
});
