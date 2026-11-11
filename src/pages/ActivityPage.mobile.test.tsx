import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ActivityPage from './ActivityPage';
import { useAuthStore } from '../store/authStore';
import * as activityApi from '../api/activity';
import * as pokemonsApi from '../api/pokemons';

vi.mock('../hooks/useLayoutMode', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../hooks/useLayoutMode')>()),
  useLayoutMode: () => 'mobile',
}));
vi.mock('../api/activity', async (importOriginal) => ({
  ...(await importOriginal<typeof activityApi>()),
  getActivityFeed: vi.fn(),
}));
vi.mock('../api/pokemons', async (importOriginal) => ({
  ...(await importOriginal<typeof pokemonsApi>()),
  getClosedList: vi.fn(),
}));

function renderPage() {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={['/leagues/l1/activity']}>
        <Routes>
          <Route path="/leagues/:leagueId/activity" element={<ActivityPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('ActivityPage en móvil', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ username: 'ash' });
    vi.mocked(activityApi.getActivityFeed).mockResolvedValue({ events: [], hasMore: false, page: 0, totalPages: 0 });
    vi.mocked(pokemonsApi.getClosedList).mockResolvedValue([]);
  });

  it('el título queda para lectores de pantalla y no se anuncia el refresco', () => {
    renderPage();
    expect(screen.getByRole('heading', { level: 1, name: 'Actividad' })).toHaveClass('sr-only');
    expect(screen.queryByText('Se actualiza cada 30 s')).not.toBeInTheDocument();
  });

  it('los filtros van en una sola tira con "Solo lo mío" detrás de "Todo"', () => {
    renderPage();
    const strip = screen.getByRole('group', { name: 'Filtros de actividad' });
    expect(within(strip).getAllByRole('button').map((b) => b.textContent))
      .toEqual(['Todo', 'Solo lo mío', 'Robos', 'Intercambios', 'Banquillo', 'Partidos', 'Tiers']);
  });

  it('los filtros se siguen pudiendo combinar', async () => {
    renderPage();
    const strip = screen.getByRole('group', { name: 'Filtros de actividad' });
    await userEvent.click(within(strip).getByRole('button', { name: 'Robos' }));
    await userEvent.click(within(strip).getByRole('button', { name: 'Solo lo mío' }));
    expect(within(strip).getByRole('button', { name: 'Robos' })).toHaveAttribute('aria-pressed', 'true');
    expect(within(strip).getByRole('button', { name: 'Todo' })).toHaveAttribute('aria-pressed', 'false');
    expect(within(strip).getByRole('button', { name: 'Solo lo mío' })).toHaveAttribute('aria-pressed', 'true');
  });
});
