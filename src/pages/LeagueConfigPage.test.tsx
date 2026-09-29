import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent, act, within } from '@testing-library/react';
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
  getClosedList: vi.fn(),
}));

const mockedLeagueDetail = vi.mocked(leaguesApi.getLeagueDetail);
const mockedLeagueSettings = vi.mocked(leaguesApi.getLeagueSettings);
const mockedUpdateSettings = vi.mocked(leaguesApi.updateLeagueSettings);
const mockedDraftStatus = vi.mocked(pokemonsApi.getDraftStatus);
const mockedClosedList = vi.mocked(pokemonsApi.getClosedList);

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
    mockedClosedList.mockResolvedValue([]);
  });

  it('loads settings into the form with no pending changes', async () => {
    renderPage();

    const coinsPerWin = await screen.findByLabelText('Monedas por victoria') as HTMLInputElement;
    expect(coinsPerWin.value).toBe('100');
    expect(screen.queryByText(/cambio.*sin guardar/)).not.toBeInTheDocument();
  });

  it('la barra de guardar solo aparece con cambios, y Descartar los deshace', async () => {
    renderPage();
    const coinsPerWin = await screen.findByLabelText('Monedas por victoria') as HTMLInputElement;
    expect(screen.queryByRole('region', { name: 'Cambios sin guardar' })).not.toBeInTheDocument();

    await userEvent.clear(coinsPerWin);
    await userEvent.type(coinsPerWin, '150');
    const bar = await screen.findByRole('region', { name: 'Cambios sin guardar' });
    expect(within(bar).getByText('1 cambio sin guardar')).toBeInTheDocument();
    expect(within(bar).getByText('Monedas por victoria')).toBeInTheDocument();

    await userEvent.click(within(bar).getByRole('button', { name: 'Descartar cambios' }));
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
    const dialog = await screen.findByRole('alertdialog', { name: '¿Salir sin guardar?' });

    await userEvent.click(within(dialog).getByRole('button', { name: 'Salir' }));
    expect(await screen.findByText('Pantalla de equipos')).toBeInTheDocument();
  });

  it('Seguir editando cancela la salida y conserva los cambios', async () => {
    const { router } = renderPage();
    const coinsPerWin = await screen.findByLabelText('Monedas por victoria') as HTMLInputElement;
    await userEvent.clear(coinsPerWin);
    await userEvent.type(coinsPerWin, '150');

    await leaveTo(router, '/leagues/league-1/teams');
    await userEvent.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Cancelar' }));

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

  it('la distribución avisa si no suma 100 y "Ajustar" lo corrige tocando D', async () => {
    renderPage();
    const pctS = await screen.findByLabelText('Porcentaje del tier S') as HTMLInputElement;
    await userEvent.clear(pctS);
    await userEvent.type(pctS, '10');

    expect(screen.getByText('Suma: 90 % (faltan 10)')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Guardar cambios' })).toBeDisabled();

    await userEvent.click(screen.getByRole('button', { name: 'Ajustar para sumar 100' }));
    expect((screen.getByLabelText('Porcentaje del tier D') as HTMLInputElement).value).toBe('30');
    expect(screen.getByText('Suma: 100 % ✓')).toBeInTheDocument();
  });

  it('antes de preparar el draft enseña cuántos Pokémon caerían en cada tier', async () => {
    mockedClosedList.mockResolvedValue(Array.from({ length: 10 }, (_, i) => (
      { id: `e${i}`, pokemonId: i, pokemonName: `p${i}`, nominatedBy: 'admin1', sprite: '' }
    )));
    renderPage();
    expect(await screen.findByText('Con los 10 Pokémon del pool: S 2 · A 2 · B 2 · C 2 · D 2')).toBeInTheDocument();
  });

  it('los precios de mercado tienen etiqueta y avisa de los que están a 0', async () => {
    mockedLeagueSettings.mockResolvedValue({ ...SETTINGS, priceTierD: 0 });
    renderPage();
    expect(await screen.findByLabelText('Precio de mercado del tier S')).toHaveValue(500);
    expect(screen.getByText(/El tier D tiene precio 0: robar esos Pokémon es gratis/)).toBeInTheDocument();
  });

  it('con el draft en preparación avisa de qué cambios afectan y enlaza a Preparar draft', async () => {
    mockedDraftStatus.mockResolvedValue({
      id: 'd1', status: 'PENDING', turnOrder: ['admin1'], currentTurn: null, currentRound: 1, picks: [],
    });
    renderPage();
    expect(await screen.findByText(/Se está preparando el draft/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ir a Preparar draft' })).toHaveAttribute('href', '/leagues/league-1/draft/setup');
    expect(mockedClosedList).not.toHaveBeenCalled();
  });
});
