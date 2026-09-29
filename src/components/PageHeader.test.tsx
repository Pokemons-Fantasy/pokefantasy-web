import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import PageHeader from './PageHeader';
import { useAuthStore } from '../store/authStore';
import * as authApi from '../api/auth';
import * as leaguesApi from '../api/leagues';
import * as tradesApi from '../api/trades';
import type { Trade } from '../api/trades';

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

const getMe = vi.mocked(authApi.getMe);
const getMyLeagues = vi.mocked(leaguesApi.getMyLeagues);
const getMyPendingTrades = vi.mocked(tradesApi.getMyPendingTrades);

const trade = (leagueId: string) => ({ id: `t-${leagueId}-${Math.random()}`, leagueId }) as Trade;

function renderHeader(path = '/') {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="*" element={<><PageHeader /><p>Ruta actual</p></>} />
          <Route path="/profile" element={<><PageHeader /><p>Pantalla de perfil</p></>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

const openDrawer = async () => {
  await userEvent.click(await screen.findByRole('button', { name: /Tu cuenta/ }));
  return screen.getByRole('dialog', { name: 'ash' });
};

describe('PageHeader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ username: 'ash' });
    getMe.mockResolvedValue({ username: 'ash', avatarVersion: null } as Awaited<ReturnType<typeof authApi.getMe>>);
    getMyLeagues.mockResolvedValue([
      { id: 'l1', name: 'Kanto', createdBy: 'ash', memberCount: 2, status: 'SETUP' },
      { id: 'l2', name: 'Johto', createdBy: 'misty', memberCount: 3, status: 'SETUP' },
    ]);
    getMyPendingTrades.mockResolvedValue([]);
  });

  it('el logo y el saludo son enlaces a la home y al perfil', () => {
    renderHeader();
    expect(screen.getByRole('link', { name: 'PokeFantasy' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: /Hola, ash/ })).toHaveAttribute('href', '/profile');
  });

  it('el avatar abre el panel con el perfil, tus ligas y la liga abierta marcada', async () => {
    renderHeader('/leagues/l2/teams');

    const drawer = await openDrawer();
    expect(within(drawer).getByRole('link', { name: 'Mi perfil' })).toHaveAttribute('href', '/profile');
    expect(await within(drawer).findByRole('link', { name: 'Kanto' })).toHaveAttribute('href', '/leagues/l1');
    expect(within(drawer).getByRole('link', { name: 'Johto' })).toHaveAttribute('aria-current', 'page');
  });

  it('ir a Mi perfil cierra el panel', async () => {
    renderHeader();

    const drawer = await openDrawer();
    await userEvent.click(within(drawer).getByRole('link', { name: 'Mi perfil' }));

    expect(await screen.findByText('Pantalla de perfil')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('Escape cierra el panel y devuelve el foco al avatar', async () => {
    renderHeader();

    const drawer = await openDrawer();
    expect(within(drawer).getByRole('button', { name: 'Cerrar' })).toHaveFocus();
    await userEvent.keyboard('{Escape}');

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Tu cuenta/ })).toHaveFocus();
  });

  it('cerrar sesión desde el panel', async () => {
    const logout = vi.fn();
    useAuthStore.setState({ logout });
    renderHeader();

    const drawer = await openDrawer();
    await userEvent.click(within(drawer).getByRole('button', { name: 'Cerrar sesión' }));

    expect(logout).toHaveBeenCalled();
  });

  it('avisa de los intercambios pendientes en el avatar y los lista por liga en el panel', async () => {
    getMyPendingTrades.mockResolvedValue([trade('l1'), trade('l1'), trade('l2')]);
    renderHeader();

    expect(await screen.findByRole('button', { name: 'Tu cuenta, 3 intercambios pendientes' })).toBeInTheDocument();
    const drawer = await openDrawer();
    expect(within(drawer).getByText('3 intercambios pendientes')).toBeInTheDocument();
    const kanto = within(drawer).getAllByRole('link', { name: /Kanto/ })[0];
    expect(kanto).toHaveAttribute('href', '/leagues/l1/teams');
    expect(within(kanto).getByText('2')).toBeInTheDocument();
  });
});
