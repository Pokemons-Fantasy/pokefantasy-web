import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createMemoryRouter, Outlet, RouterProvider } from 'react-router-dom';
import DocumentTitle, { type TitleHandle } from './DocumentTitle';
import { useAuthStore } from '../store/authStore';

vi.mock('../api/leagues', () => ({ getLeagueDetail: vi.fn(async () => ({ id: 'l1', name: 'Liga Kanto' })) }));
vi.mock('../api/pokemons', () => ({ getDraftStatus: vi.fn(async () => ({ status: 'COMPLETED', currentTurn: null })) }));
import { getLeagueDetail } from '../api/leagues';
import { getDraftStatus } from '../api/pokemons';

function renderAt(path: string) {
  const handle = (title: TitleHandle['title']): TitleHandle => ({ title });
  const router = createMemoryRouter([{
    element: <><DocumentTitle /><Outlet /></>,
    children: [
      { path: '/leagues', handle: handle('Mis ligas'), element: null },
      {
        path: '/leagues/:leagueId',
        element: <Outlet />,
        children: [
          { path: 'standings', handle: handle('Clasificación'), element: null },
          { path: 'players/:username', handle: handle((params) => params.username ?? 'Jugador'), element: null },
        ],
      },
    ],
  }], { initialEntries: [path] });
  render(<QueryClientProvider client={new QueryClient()}><RouterProvider router={router} /></QueryClientProvider>);
}

describe('DocumentTitle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ username: 'ash' });
  });

  it('fuera de una liga: la sección y la app, sin pedir nada', async () => {
    renderAt('/leagues');
    await waitFor(() => expect(document.title).toBe('Mis ligas · PokeFantasy'));
    expect(getLeagueDetail).not.toHaveBeenCalled();
  });

  it('dentro de una liga: la sección y el nombre de la liga', async () => {
    renderAt('/leagues/l1/standings');
    await waitFor(() => expect(document.title).toBe('Clasificación · Liga Kanto · PokeFantasy'));
  });

  it('el título de una ruta puede depender de sus parámetros', async () => {
    renderAt('/leagues/l1/players/brock');
    await waitFor(() => expect(document.title).toBe('brock · Liga Kanto · PokeFantasy'));
  });

  it('con tu turno en el draft, la pestaña lo dice', async () => {
    vi.mocked(getDraftStatus).mockResolvedValueOnce({ status: 'IN_PROGRESS', currentTurn: 'ash' } as never);
    renderAt('/leagues/l1/standings');
    await waitFor(() => expect(document.title).toBe('⏰ Te toca · Clasificación · Liga Kanto · PokeFantasy'));
  });
});
