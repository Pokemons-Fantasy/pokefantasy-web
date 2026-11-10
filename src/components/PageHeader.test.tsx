import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import PageHeader from './PageHeader';
import { useAuthStore } from '../store/authStore';
import * as authApi from '../api/auth';
import * as leaguesApi from '../api/leagues';
import * as tradesApi from '../api/trades';
import type { Trade } from '../api/trades';
import { useLayoutMode } from '../hooks/useLayoutMode';
import { setLastLeague } from '../utils/lastLeague';

vi.mock('../api/auth', async (importOriginal) => ({
  ...(await importOriginal<typeof authApi>()),
  getMe: vi.fn(),
}));
vi.mock('../api/leagues', async (importOriginal) => ({
  ...(await importOriginal<typeof leaguesApi>()),
  getMyLeagues: vi.fn(),
}));
vi.mock('../api/trades', async (importOriginal) => ({
  ...(await importOriginal<typeof tradesApi>()),
  getMyPendingTrades: vi.fn(),
}));
vi.mock('../hooks/useLayoutMode', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../hooks/useLayoutMode')>()),
  useLayoutMode: vi.fn(() => 'desktop'),
}));

const getMe = vi.mocked(authApi.getMe);
const getMyLeagues = vi.mocked(leaguesApi.getMyLeagues);
const getMyPendingTrades = vi.mocked(tradesApi.getMyPendingTrades);
const layoutMode = vi.mocked(useLayoutMode);

const trade = (leagueId: string) => ({ id: `t-${leagueId}-${Math.random()}`, leagueId }) as Trade;

function renderHeader(path = '/') {
  const router = createMemoryRouter([
    { path: '/profile', handle: { title: 'Mi perfil' }, element: <><PageHeader /><p>Pantalla de perfil</p></> },
    { path: '*', element: <><PageHeader /><p>Ruta actual</p></> },
  ], { initialEntries: [path] });
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

const openAccount = async () => {
  await userEvent.click(await screen.findByRole('button', { name: /Tu cuenta/ }));
  return screen.getByRole('dialog', { name: 'ash' });
};

describe('PageHeader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    layoutMode.mockReturnValue('desktop');
    useAuthStore.setState({ username: 'ash' });
    getMe.mockResolvedValue({ username: 'ash', avatarVersion: null } as Awaited<ReturnType<typeof authApi.getMe>>);
    getMyLeagues.mockResolvedValue([
      { id: 'l1', name: 'Kanto', createdBy: 'ash', memberCount: 2, status: 'SETUP' },
      { id: 'l2', name: 'Johto', createdBy: 'misty', memberCount: 3, status: 'SETUP' },
    ]);
    getMyPendingTrades.mockResolvedValue([]);
  });

  describe('en escritorio', () => {
    it('el logo y el saludo son enlaces a la home y al perfil', async () => {
      renderHeader();
      expect(await screen.findByRole('link', { name: 'PokeFantasy' })).toHaveAttribute('href', '/');
      expect(screen.getByRole('link', { name: /Hola, ash/ })).toHaveAttribute('href', '/profile');
      expect(screen.getByRole('button', { name: 'Cerrar sesión' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Tu cuenta/ })).not.toBeInTheDocument();
    });
  });

  describe('en móvil', () => {
    beforeEach(() => layoutMode.mockReturnValue('mobile'));

    it('"Volver" lleva a la última liga abierta', async () => {
      setLastLeague('l1');
      renderHeader('/profile');
      await waitFor(() => expect(screen.getByRole('link', { name: 'Volver' })).toHaveAttribute('href', '/leagues/l1'));
    });

    it('si ya no estás en la última liga, "Volver" lleva a Mis ligas', async () => {
      setLastLeague('l9');
      renderHeader('/profile');
      await screen.findByRole('link', { name: 'Volver' });
      await new Promise((r) => setTimeout(r, 0));
      expect(screen.getByRole('link', { name: 'Volver' })).toHaveAttribute('href', '/leagues');
    });

    it('en Mis ligas no hay "Volver"', async () => {
      setLastLeague('l1');
      renderHeader('/leagues');
      expect(await screen.findByRole('button', { name: /Tu cuenta/ })).toBeInTheDocument();
      expect(screen.queryByRole('link', { name: 'Volver' })).not.toBeInTheDocument();
    });

    it('sin última liga, "Volver" lleva a Mis ligas', async () => {
      renderHeader('/profile');
      expect(await screen.findByRole('link', { name: 'Volver' })).toHaveAttribute('href', '/leagues');
    });

    it('el título es la sección de la ruta', async () => {
      renderHeader('/profile');
      expect(await screen.findByRole('banner')).toHaveTextContent('Mi perfil');
    });

    it('el avatar abre Tu cuenta con el perfil, tus ligas y la liga abierta marcada', async () => {
      renderHeader('/leagues/l2/teams');

      const sheet = await openAccount();
      expect(within(sheet).getByRole('link', { name: 'Mi perfil' })).toHaveAttribute('href', '/profile');
      expect(await within(sheet).findByRole('link', { name: 'Kanto' })).toHaveAttribute('href', '/leagues/l1');
      expect(within(sheet).getByRole('link', { name: 'Johto' })).toHaveAttribute('aria-current', 'page');
    });

    it('ir a Mi perfil cierra Tu cuenta', async () => {
      renderHeader();

      const sheet = await openAccount();
      await userEvent.click(within(sheet).getByRole('link', { name: 'Mi perfil' }));

      expect(await screen.findByText('Pantalla de perfil')).toBeInTheDocument();
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('Escape cierra Tu cuenta y devuelve el foco al avatar', async () => {
      renderHeader();

      const sheet = await openAccount();
      expect(within(sheet).getByRole('button', { name: 'Cerrar' })).toHaveFocus();
      await userEvent.keyboard('{Escape}');

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Tu cuenta/ })).toHaveFocus();
    });

    it('cerrar sesión desde Tu cuenta', async () => {
      const logout = vi.fn();
      useAuthStore.setState({ logout });
      renderHeader();

      const sheet = await openAccount();
      await userEvent.click(within(sheet).getByRole('button', { name: 'Cerrar sesión' }));

      expect(logout).toHaveBeenCalled();
    });

    it('avisa de los intercambios pendientes en el avatar y los lista por liga', async () => {
      getMyPendingTrades.mockResolvedValue([trade('l1'), trade('l1'), trade('l2')]);
      renderHeader();

      expect(await screen.findByRole('button', { name: 'Tu cuenta, 3 intercambios pendientes' })).toBeInTheDocument();
      const sheet = await openAccount();
      expect(within(sheet).getByText('3 intercambios pendientes')).toBeInTheDocument();
      const kanto = within(sheet).getAllByRole('link', { name: /Kanto/ })[0];
      expect(kanto).toHaveAttribute('href', '/leagues/l1/teams');
      expect(within(kanto).getByText('2')).toBeInTheDocument();
    });
  });
});
