import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import LeagueConfigPage from './LeagueConfigPage';
import { useAuthStore } from '../store/authStore';
import * as leaguesApi from '../api/leagues';
import * as pokemonsApi from '../api/pokemons';
import type { LeagueDetail, LeagueSettings } from '../api/leagues';

vi.mock('../api/leagues', async (importOriginal) => ({
  ...(await importOriginal<typeof leaguesApi>()),
  getLeagueDetail: vi.fn(),
  getLeagueSettings: vi.fn(),
  updateLeagueSettings: vi.fn(),
}));
vi.mock('../api/pokemons', async (importOriginal) => ({
  ...(await importOriginal<typeof pokemonsApi>()),
  getDraftStatus: vi.fn(),
}));

const mockedLeagueDetail = vi.mocked(leaguesApi.getLeagueDetail);
const mockedLeagueSettings = vi.mocked(leaguesApi.getLeagueSettings);
const mockedUpdateSettings = vi.mocked(leaguesApi.updateLeagueSettings);
const mockedDraftStatus = vi.mocked(pokemonsApi.getDraftStatus);

const LEAGUE: LeagueDetail = {
  id: 'league-1',
  name: 'Liga Test',
  createdBy: 'admin1',
  status: 'ACTIVE',
  members: [{ username: 'admin1', leagueRole: 'ADMIN' }],
};

const SETTINGS: LeagueSettings = {
  coinsPerWin: 100,
  coinsPerLoss: 50,
  priceTierS: 500,
  priceTierA: 300,
  priceTierB: 200,
  priceTierC: 100,
  priceTierD: 50,
  tierPctS: 20,
  tierPctA: 20,
  tierPctB: 20,
  tierPctC: 20,
  tierPctD: 20,
  maxTeamSize: 20,
};

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = createMemoryRouter([
    { path: '/leagues/:leagueId/config', element: <LeagueConfigPage /> },
    { path: '/leagues/:leagueId/teams', element: <p>Pantalla de equipos</p> },
  ], { initialEntries: ['/leagues/league-1/config'] });
  const result = render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
  return { ...result, router };
}

/** Navega fuera de la página. Antes vacía los efectos pendientes: tras cargar los ajustes el formulario
 *  se sincroniza en un efecto, y useBlocker registra su función también en un efecto. */
async function leaveTo(router: ReturnType<typeof renderPage>['router'], path: string) {
  await act(async () => {});
  await act(async () => { await router.navigate(path); });
}

describe('LeagueConfigPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ username: 'admin1' });
    mockedLeagueDetail.mockResolvedValue(LEAGUE);
    mockedDraftStatus.mockResolvedValue(null);
    mockedLeagueSettings.mockResolvedValue(SETTINGS);
    mockedUpdateSettings.mockResolvedValue(undefined);
  });

  it('loads settings into the form with no pending changes', async () => {
    renderPage();

    const coinsPerWin = await screen.findByLabelText('Monedas por victoria') as HTMLInputElement;
    expect(coinsPerWin.value).toBe('100');
    expect(screen.queryByText(/cambio.*sin guardar/)).not.toBeInTheDocument();
  });

  it('tracks a pending change when a field is edited, and Cancelar reverts it', async () => {
    renderPage();
    const coinsPerWin = await screen.findByLabelText('Monedas por victoria') as HTMLInputElement;

    await userEvent.clear(coinsPerWin);
    await userEvent.type(coinsPerWin, '150');
    expect(await screen.findByText('1 cambio sin guardar')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    await waitFor(() => expect(coinsPerWin.value).toBe('100'));
    expect(screen.queryByText(/cambio.*sin guardar/)).not.toBeInTheDocument();
  });

  it('blocks submit and shows an error when maxTeamSize is below the minimum', async () => {
    const { container } = renderPage();
    const maxTeamSize = await screen.findByLabelText('Tamaño máximo del equipo') as HTMLInputElement;

    await userEvent.clear(maxTeamSize);
    await userEvent.type(maxTeamSize, '5');
    // fireEvent.submit evita la validación HTML5 nativa del input (min=10), que en un
    // click real interceptaría el submit antes de llegar a la validación propia de la página.
    fireEvent.submit(container.querySelector('#settings-form')!);

    expect(await screen.findByText('El tamaño máximo del equipo debe ser >= 10')).toBeInTheDocument();
    expect(mockedUpdateSettings).not.toHaveBeenCalled();
  });

  it('submits the edited settings and shows a success message', async () => {
    renderPage();
    const coinsPerWin = await screen.findByLabelText('Monedas por victoria') as HTMLInputElement;

    await userEvent.clear(coinsPerWin);
    await userEvent.type(coinsPerWin, '150');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    await waitFor(() => expect(mockedUpdateSettings).toHaveBeenCalledTimes(1));
    expect(mockedUpdateSettings).toHaveBeenCalledWith('league-1', expect.objectContaining({
      coinsPerWin: 150,
      coinsPerLoss: 50,
    }));
  });

  it('shows a read-only banner for non-admin members and hides the save/cancel buttons', async () => {
    useAuthStore.setState({ username: 'someoneelse' });
    renderPage();

    expect(await screen.findByText('Solo el admin puede modificar estos valores. Vista de solo lectura.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Guardar cambios' })).not.toBeInTheDocument();
  });

  it('con cambios sin guardar, salir pide confirmación y Descartar completa la navegación', async () => {
    const { router } = renderPage();
    const coinsPerWin = await screen.findByLabelText('Monedas por victoria');
    await userEvent.clear(coinsPerWin);
    await userEvent.type(coinsPerWin, '150');

    await leaveTo(router, '/leagues/league-1/teams');
    expect(await screen.findByText('Cambios sin guardar')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Descartar cambios' }));
    expect(await screen.findByText('Pantalla de equipos')).toBeInTheDocument();
  });

  it('Seguir editando cancela la salida y conserva los cambios', async () => {
    const { router } = renderPage();
    const coinsPerWin = await screen.findByLabelText('Monedas por victoria') as HTMLInputElement;
    await userEvent.clear(coinsPerWin);
    await userEvent.type(coinsPerWin, '150');

    await leaveTo(router, '/leagues/league-1/teams');
    await userEvent.click(await screen.findByRole('button', { name: 'Seguir editando' }));

    expect(router.state.location.pathname).toBe('/leagues/league-1/config');
    expect(coinsPerWin.value).toBe('150');
  });

  it('sin cambios se sale sin preguntar', async () => {
    const { router } = renderPage();
    await screen.findByLabelText('Monedas por victoria');
    await leaveTo(router, '/leagues/league-1/teams');
    expect(await screen.findByText('Pantalla de equipos')).toBeInTheDocument();
  });

  it('tras guardar se sale sin preguntar', async () => {
    const { router } = renderPage();
    const coinsPerWin = await screen.findByLabelText('Monedas por victoria');
    await userEvent.clear(coinsPerWin);
    await userEvent.type(coinsPerWin, '150');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
    await waitFor(() => expect(mockedUpdateSettings).toHaveBeenCalledTimes(1));

    await leaveTo(router, '/leagues/league-1/teams');
    expect(await screen.findByText('Pantalla de equipos')).toBeInTheDocument();
  });
});
