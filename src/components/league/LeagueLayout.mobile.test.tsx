import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createMemoryRouter, RouterProvider, useBlocker } from 'react-router-dom';
import LeagueLayout from './LeagueLayout';
import { useAuthStore } from '../../store/authStore';
import * as leaguesApi from '../../api/leagues';
import * as pokemonsApi from '../../api/pokemons';
import * as tradesApi from '../../api/trades';
import * as authApi from '../../api/auth';
import type { LeagueDetail } from '../../api/leagues';
import type { DraftStatus } from '../../api/pokemons';
import type { Trade } from '../../api/trades';
import { getLastLeague } from '../../utils/lastLeague';

vi.mock('../../hooks/useLayoutMode', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../hooks/useLayoutMode')>()),
  useLayoutMode: () => 'mobile',
}));
vi.mock('../../api/leagues', async (importOriginal) => ({
  ...(await importOriginal<typeof leaguesApi>()),
  getLeagueDetail: vi.fn(),
  getMyLeagues: vi.fn(),
}));
vi.mock('../../api/pokemons', async (importOriginal) => ({
  ...(await importOriginal<typeof pokemonsApi>()),
  getDraftStatus: vi.fn(),
}));
vi.mock('../../api/trades', async (importOriginal) => ({
  ...(await importOriginal<typeof tradesApi>()),
  getMyPendingTrades: vi.fn(),
}));
vi.mock('../../api/auth', async (importOriginal) => ({
  ...(await importOriginal<typeof authApi>()),
  getMe: vi.fn(),
}));

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

const trade = (leagueId: string) => ({ id: `t-${leagueId}-${Math.random()}`, leagueId }) as Trade;

/** Configuración con cambios sin guardar: bloquea cualquier salida, como LeagueConfigPage. */
function DirtyConfig() {
  const blocker = useBlocker(true);
  return <p>configuración {blocker.state === 'blocked' ? 'bloqueada' : 'abierta'}</p>;
}

function renderAt(path: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = createMemoryRouter([
    {
      path: '/leagues/:leagueId',
      element: <LeagueLayout />,
      children: [
        { path: 'config', element: <DirtyConfig /> },
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

const bar = () => screen.findByRole('navigation', { name: 'Secciones de la liga' });
const barNames = async () =>
  [...(await bar()).querySelectorAll('a, button')].map((el) => el.textContent);

describe('LeagueLayout en móvil', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    useAuthStore.setState({ username: 'ash' });
    vi.mocked(leaguesApi.getLeagueDetail).mockResolvedValue(LEAGUE);
    vi.mocked(leaguesApi.getMyLeagues).mockResolvedValue([
      { id: 'l1', name: 'Liga Kanto', createdBy: 'ash', memberCount: 2, status: 'SETUP' },
      { id: 'l2', name: 'Liga Johto', createdBy: 'misty', memberCount: 3, status: 'SETUP' },
    ]);
    vi.mocked(pokemonsApi.getDraftStatus).mockResolvedValue(draft('COMPLETED'));
    vi.mocked(tradesApi.getMyPendingTrades).mockResolvedValue([]);
    vi.mocked(authApi.getMe).mockResolvedValue({ username: 'ash', avatarVersion: null } as Awaited<ReturnType<typeof authApi.getMe>>);
  });

  it('en temporada la barra tiene Equipos, Calendario, Clasificación, Actividad y Más', async () => {
    renderAt('/leagues/l1/teams');
    await waitFor(async () => expect(await barNames()).toEqual(['Equipos', 'Calendario', 'Clasificación', 'Actividad', 'Más']));
    expect(within(await bar()).getByRole('link', { name: 'Equipos' })).toHaveAttribute('aria-current', 'page');
  });

  it('con el draft en curso la barra tiene Draft, Pool, Miembros y Más', async () => {
    vi.mocked(pokemonsApi.getDraftStatus).mockResolvedValue(draft('IN_PROGRESS'));
    renderAt('/leagues/l1/draft');
    await waitFor(async () => expect(await barNames()).toEqual(['Draft', 'Pool', 'Miembros', 'Más']));
  });

  it('Más abre el menú de la liga; el admin ve Gestionar tiers', async () => {
    renderAt('/leagues/l1/teams');
    await userEvent.click(await within(await bar()).findByRole('button', { name: 'Más' }));
    const sheet = screen.getByRole('dialog', { name: 'Más' });
    expect(within(sheet).getAllByRole('link').map((l) => l.textContent))
      .toEqual(['Draft', 'Configuración', 'Gestionar tiers', 'Miembros']);
  });

  it('un jugador no ve Gestionar tiers en Más', async () => {
    useAuthStore.setState({ username: 'brock' });
    renderAt('/leagues/l1/teams');
    await userEvent.click(await within(await bar()).findByRole('button', { name: 'Más' }));
    const sheet = screen.getByRole('dialog', { name: 'Más' });
    expect(within(sheet).getAllByRole('link').map((l) => l.textContent)).toEqual(['Draft', 'Configuración', 'Miembros']);
  });

  it('en una sección de Más, el botón Más se marca como actual', async () => {
    renderAt('/leagues/l1/members');
    expect(await within(await bar()).findByRole('button', { name: 'Más' })).toHaveAttribute('aria-current', 'page');
  });

  it('el nombre de la liga abre Cambiar de liga y lleva a otra', async () => {
    const router = renderAt('/leagues/l1/teams');
    await userEvent.click(await screen.findByRole('button', { name: /Cambiar de liga/ }));
    const sheet = screen.getByRole('dialog', { name: 'Cambiar de liga' });
    expect(await within(sheet).findByRole('link', { name: 'Liga Kanto' })).toHaveAttribute('aria-current', 'page');
    await userEvent.click(within(sheet).getByRole('link', { name: 'Liga Johto' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/leagues/l2'));
  });

  it('la pestaña Equipos avisa de los intercambios pendientes de esta liga', async () => {
    vi.mocked(tradesApi.getMyPendingTrades).mockResolvedValue([trade('l1'), trade('l1'), trade('l2')]);
    renderAt('/leagues/l1/schedule');
    expect(await within(await bar()).findByRole('link', { name: 'Equipos, 2 intercambios pendientes' })).toBeInTheDocument();
  });

  it('recuerda la liga como la última abierta', async () => {
    renderAt('/leagues/l1/teams');
    await bar();
    await waitFor(() => expect(getLastLeague()).toBe('l1'));
  });

  it('con cambios sin guardar, la barra no saca de Configuración', async () => {
    const router = renderAt('/leagues/l1/config');
    expect(await screen.findByText('configuración abierta')).toBeInTheDocument();
    await userEvent.click(within(await bar()).getByRole('link', { name: 'Equipos' }));
    expect(await screen.findByText('configuración bloqueada')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/leagues/l1/config');
  });
});
