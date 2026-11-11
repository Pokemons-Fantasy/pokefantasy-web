import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import SchedulePage from './SchedulePage';
import { useAuthStore } from '../store/authStore';
import * as leaguesApi from '../api/leagues';
import * as pokemonsApi from '../api/pokemons';
import type { LeagueDetail, MatchDto, ScheduleResponse } from '../api/leagues';

vi.mock('../hooks/useLayoutMode', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../hooks/useLayoutMode')>()),
  useLayoutMode: () => 'mobile',
}));
vi.mock('../api/leagues', async (importOriginal) => ({
  ...(await importOriginal<typeof leaguesApi>()),
  getLeagueDetail: vi.fn(),
  getSchedule: vi.fn(),
  getMyCoinBalance: vi.fn(),
  correctMatchResult: vi.fn(),
  revertMatchResult: vi.fn(),
  recordMatchResult: vi.fn(),
  getLeagueSettings: vi.fn().mockResolvedValue({}),
  getReplayCandidates: vi.fn().mockResolvedValue([]),
}));
vi.mock('../api/pokemons', async (importOriginal) => ({
  ...(await importOriginal<typeof pokemonsApi>()),
  getDraftStatus: vi.fn().mockResolvedValue(null),
  getClosedList: vi.fn().mockResolvedValue([]),
}));
vi.mock('@capacitor/clipboard', () => ({ Clipboard: { write: vi.fn().mockResolvedValue(undefined) } }));
const api = vi.mocked(leaguesApi);

const LEAGUE: LeagueDetail = {
  id: 'league-1',
  name: 'Liga Test',
  createdBy: 'ash',
  status: 'ACTIVE',
  members: [
    { username: 'ash', leagueRole: 'ADMIN' },
    { username: 'misty', leagueRole: 'USER' },
    { username: 'oak', leagueRole: 'ADMIN' },
  ],
};

const played = (id: string, player1: string, player2: string): MatchDto =>
  ({ id, player1, player2, winnerUsername: player1, status: 'COMPLETED', winnerScore: 6, loserScore: 2 });
const pending = (id: string, player1: string, player2: string): MatchDto =>
  ({ id, player1, player2, status: 'PENDING' });
const schedule = (...rounds: MatchDto[][]): ScheduleResponse => ({
  leagueId: 'league-1', stealWindowOpen: false, swapWindowOpen: false,
  jornadas: rounds.map((matches, i) => ({ roundNumber: i + 1, startDate: `2026-11-0${i + 1}`, matches })),
});

/** J1 jugada; J2 en juego con tu partido (misty vs ash) detrás de otro. */
const EN_CURSO = schedule(
  [played('m1', 'ash', 'may')],
  [pending('m2', 'brock', 'may'), pending('m3', 'misty', 'ash')],
);

function renderAt(path: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = createMemoryRouter(
    [{ path: '/leagues/:leagueId/schedule', element: <SchedulePage /> }],
    { initialEntries: [path] },
  );
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return router;
}

const URL = '/leagues/league-1/schedule';
const tabs = () => screen.findByRole('tablist', { name: 'Jornadas' });
const panel = () => screen.getByRole('tabpanel');
const matchIds = () => [...panel().querySelectorAll('[data-testid^="match-"]')].map((el) => el.getAttribute('data-testid'));

describe('SchedulePage en móvil', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ username: 'ash' });
    api.getLeagueDetail.mockResolvedValue(LEAGUE);
    api.getSchedule.mockResolvedValue(EN_CURSO);
    api.getMyCoinBalance.mockResolvedValue({ coins: 100 });
    api.recordMatchResult.mockResolvedValue(undefined);
  });

  it('abre la jornada en juego con tu partido primero', async () => {
    renderAt(URL);
    const list = await tabs();
    expect(within(list).getAllByRole('tab').map((t) => t.getAttribute('aria-label')))
      .toEqual(['Jornada 1, jugada', 'Jornada 2, actual']);
    expect(within(list).getByRole('tab', { name: 'Jornada 2, actual' })).toHaveAttribute('aria-selected', 'true');
    expect(within(panel()).getByRole('heading', { name: 'Tu partido' })).toBeInTheDocument();
    expect(matchIds()).toEqual(['match-m3', 'match-m2']);
  });

  it('elegir otra jornada la pone en la URL sin añadir historial', async () => {
    const router = renderAt(URL);
    await userEvent.click(within(await tabs()).getByRole('tab', { name: 'Jornada 1, jugada' }));
    expect(router.state.location.search).toBe('?jornada=1');
    expect(router.state.historyAction).toBe('REPLACE');
    expect(matchIds()).toEqual(['match-m1']);
  });

  it.each(['?jornada=99', '?jornada=abc'])('con %s abre la jornada en juego', async (search) => {
    renderAt(URL + search);
    expect(within(await tabs()).getByRole('tab', { name: 'Jornada 2, actual' })).toHaveAttribute('aria-selected', 'true');
  });

  it('si descansas, lo dice y avisa de tu próximo partido', async () => {
    api.getSchedule.mockResolvedValue(schedule(
      [pending('m1', 'brock', 'may')],
      [pending('m2', 'ash', 'gary')],
    ));
    const router = renderAt(URL);
    await tabs();
    expect(within(panel()).getByText('Descansas esta jornada')).toBeInTheDocument();
    expect(screen.getByText('Tu próximo partido: J2 vs gary')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Ver' }));
    expect(router.state.location.search).toBe('?jornada=2');
    expect(screen.queryByText(/Tu próximo partido/)).not.toBeInTheDocument();
    // El aviso desaparece: el foco pasa a la jornada elegida, no se pierde
    expect(screen.getByRole('tab', { name: 'Jornada 2' })).toHaveFocus();
  });

  it('en la jornada de tu próximo partido no hay aviso', async () => {
    renderAt(URL);
    await tabs();
    expect(screen.queryByText(/Tu próximo partido/)).not.toBeInTheDocument();
  });

  it('con la temporada terminada abre la última jornada y no hay aviso', async () => {
    api.getSchedule.mockResolvedValue(schedule([played('m1', 'ash', 'may')], [played('m2', 'misty', 'ash')]));
    renderAt(URL);
    const list = await tabs();
    expect(within(list).getByRole('tab', { name: 'Jornada 2, jugada' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.queryByText(/Tu próximo partido/)).not.toBeInTheDocument();
  });

  it('un admin que no juega ve los partidos con Corregir, sin "Tu partido" ni "Descansas"', async () => {
    useAuthStore.setState({ username: 'oak' });
    renderAt(URL + '?jornada=1');
    await tabs();
    expect(within(panel()).queryByRole('heading', { name: 'Tu partido' })).not.toBeInTheDocument();
    expect(within(panel()).queryByText('Descansas esta jornada')).not.toBeInTheDocument();
    expect(within(panel()).getByRole('button', { name: 'Corregir resultado ash vs may' })).toBeInTheDocument();
  });

  it('sin calendario avisa de que se generará y no hay jornadas', async () => {
    api.getSchedule.mockResolvedValue(null as unknown as ScheduleResponse);
    renderAt(URL);
    expect(await screen.findByText('El calendario se generará automáticamente al completar el draft.')).toBeInTheDocument();
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
  });

  it('Resultado en tu partido abre "¿Quién ganó?"', async () => {
    renderAt(URL);
    await tabs();
    await userEvent.click(within(screen.getByTestId('match-m3')).getByRole('button', { name: /Resultado/ }));
    expect(await screen.findByRole('dialog', { name: '¿Quién ganó?' })).toBeInTheDocument();
  });
});
