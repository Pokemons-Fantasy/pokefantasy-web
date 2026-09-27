import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import LeagueLayout from './LeagueLayout';
import LeagueIndexRedirect from './LeagueIndexRedirect';
import { useAuthStore } from '../../store/authStore';
import * as leaguesApi from '../../api/leagues';
import * as pokemonsApi from '../../api/pokemons';
import type { LeagueDetail } from '../../api/leagues';
import type { DraftStatus } from '../../api/pokemons';

vi.mock('../../api/leagues', async (importOriginal) => ({
  ...(await importOriginal<typeof leaguesApi>()),
  getLeagueDetail: vi.fn(),
}));
vi.mock('../../api/pokemons', async (importOriginal) => ({
  ...(await importOriginal<typeof pokemonsApi>()),
  getDraftStatus: vi.fn(),
}));

const mockedLeague = vi.mocked(leaguesApi.getLeagueDetail);
const mockedDraft = vi.mocked(pokemonsApi.getDraftStatus);

const LEAGUE: LeagueDetail = {
  id: 'l1',
  name: 'Liga Kanto',
  createdBy: 'ash',
  status: 'SETUP',
  members: [
    { username: 'ash', leagueRole: 'ADMIN' },
    { username: 'brock', leagueRole: 'USER' },
  ],
};

const draft = (status: DraftStatus['status']): DraftStatus => ({
  id: 'd1', status, turnOrder: ['ash', 'brock'], currentTurn: null, currentRound: 1, picks: [],
});

function renderAt(path: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = createMemoryRouter([
    {
      path: '/leagues/:leagueId',
      element: <LeagueLayout />,
      children: [
        { index: true, element: <LeagueIndexRedirect /> },
        { path: '*', element: <p>contenido de la sección</p> },
      ],
    },
  ], { initialEntries: [path] });
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return router;
}

const tabNames = () =>
  screen.getAllByRole('link').filter((l) => l.classList.contains('league-tab')).map((l) => l.textContent);

describe('LeagueLayout', () => {
  beforeEach(() => {
    useAuthStore.setState({ username: 'ash' });
    mockedLeague.mockResolvedValue(LEAGUE);
    mockedDraft.mockResolvedValue(draft('COMPLETED'));
  });

  it('en temporada muestra las pestañas de temporada y marca la actual', async () => {
    renderAt('/leagues/l1/schedule');

    const current = await screen.findByRole('link', { name: 'Calendario' });
    expect(current).toHaveAttribute('aria-current', 'page');
    expect(tabNames()).toEqual(['Equipos', 'Calendario', 'Clasificación', 'Actividad', 'Draft']);
    expect(screen.getByRole('navigation', { name: 'Secciones de la liga' })).toBeInTheDocument();
    expect(screen.getByText('Liga Kanto')).toBeInTheDocument();
  });

  it('el perfil de un jugador marca Clasificación', async () => {
    renderAt('/leagues/l1/players/brock');
    expect(await screen.findByRole('link', { name: 'Clasificación' })).toHaveAttribute('aria-current', 'page');
  });

  it('sin draft muestra las pestañas de preparación', async () => {
    mockedDraft.mockResolvedValue(null);
    renderAt('/leagues/l1/pool');
    await screen.findByRole('link', { name: 'Pool' });
    expect(tabNames()).toEqual(['Miembros', 'Pool', 'Draft']);
  });

  it('la portada de la liga redirige a la primera pestaña de la fase', async () => {
    const router = renderAt('/leagues/l1');
    await waitFor(() => expect(router.state.location.pathname).toBe('/leagues/l1/teams'));
  });

  it('sin draft, la portada redirige a Miembros', async () => {
    mockedDraft.mockResolvedValue(null);
    const router = renderAt('/leagues/l1');
    await waitFor(() => expect(router.state.location.pathname).toBe('/leagues/l1/members'));
  });

  it('el menú se abre, muestra las entradas de admin y se cierra con Escape devolviendo el foco', async () => {
    renderAt('/leagues/l1/teams');
    const button = await screen.findByRole('button', { name: 'Más opciones de la liga' });
    expect(button).toHaveAttribute('aria-expanded', 'false');

    await userEvent.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('link', { name: 'Configuración' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Gestionar tiers' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Miembros' })).toBeInTheDocument();

    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('link', { name: 'Configuración' })).not.toBeInTheDocument();
    expect(button).toHaveFocus();
  });

  it('un jugador no ve Gestionar tiers', async () => {
    useAuthStore.setState({ username: 'brock' });
    renderAt('/leagues/l1/teams');
    await userEvent.click(await screen.findByRole('button', { name: 'Más opciones de la liga' }));
    expect(screen.getByRole('link', { name: 'Configuración' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Gestionar tiers' })).not.toBeInTheDocument();
  });

  it('con Configuración abierta el engranaje se marca activo', async () => {
    renderAt('/leagues/l1/config');
    const button = await screen.findByRole('button', { name: 'Más opciones de la liga' });
    expect(button).toHaveClass('active');
  });

  it('si la liga no existe o no eres miembro, avisa y no pinta pestañas', async () => {
    mockedLeague.mockRejectedValue(new Error('403'));
    renderAt('/leagues/l1/teams');
    expect(await screen.findByText('Liga no encontrada')).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Secciones de la liga' })).not.toBeInTheDocument();
    expect(screen.queryByText('contenido de la sección')).not.toBeInTheDocument();
  });
});
