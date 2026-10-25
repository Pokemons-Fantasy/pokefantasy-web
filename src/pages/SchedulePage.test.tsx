import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import SchedulePage from './SchedulePage';
import { useAuthStore } from '../store/authStore';
import { useToastStore } from '../store/toastStore';
import * as leaguesApi from '../api/leagues';
import * as pokemonsApi from '../api/pokemons';
import { Clipboard } from '@capacitor/clipboard';
import type { LeagueDetail, ScheduleResponse } from '../api/leagues';

vi.mock('../api/leagues', async (importOriginal) => ({
  ...(await importOriginal<typeof leaguesApi>()),
  getLeagueDetail: vi.fn(),
  getSchedule: vi.fn(),
  getMyCoinBalance: vi.fn(),
  correctMatchResult: vi.fn(),
  revertMatchResult: vi.fn(),
  recordMatchResult: vi.fn(),
  getLeagueSettings: vi.fn().mockResolvedValue({}),
}));
vi.mock('../api/pokemons', async (importOriginal) => ({
  ...(await importOriginal<typeof pokemonsApi>()),
  getDraftStatus: vi.fn().mockResolvedValue(null),
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
  ],
};

const SCHEDULE: ScheduleResponse = {
  leagueId: 'league-1',
  stealWindowOpen: false,
  swapWindowOpen: false,
  jornadas: [{
    roundNumber: 1,
    matches: [
      { id: 'm1', player1: 'ash', player2: 'misty', winnerUsername: 'ash', status: 'COMPLETED' },
      { id: 'm3', player1: 'brock', player2: 'ash', winnerUsername: 'ash', status: 'COMPLETED',
        winnerScore: 3, loserScore: 1 },
      { id: 'm2', player1: 'brock', player2: 'misty', status: 'PENDING' },
    ],
  }],
};

function renderPage() {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={['/leagues/league-1/schedule']}>
        <Routes>
          <Route path="/leagues/:leagueId/schedule" element={<SchedulePage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('SchedulePage — corregir resultados', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.getLeagueDetail.mockResolvedValue(LEAGUE);
    api.getSchedule.mockResolvedValue(SCHEDULE);
    api.getMyCoinBalance.mockResolvedValue({ coins: 100 });
    api.correctMatchResult.mockResolvedValue(undefined);
    api.revertMatchResult.mockResolvedValue(undefined);
    api.recordMatchResult.mockResolvedValue(undefined);
  });

  it('admin can switch the winner of a completed match', async () => {
    useAuthStore.setState({ username: 'ash' });
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: 'Corregir resultado ash vs misty' }));
    await user.click(screen.getByRole('button', { name: '✓ Ganó misty' }));

    await waitFor(() => expect(api.correctMatchResult).toHaveBeenCalledWith('league-1', 'm1', 'misty', null));
    expect(api.revertMatchResult).not.toHaveBeenCalled();
  });

  it('admin can undo a result', async () => {
    useAuthStore.setState({ username: 'ash' });
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: 'Corregir resultado ash vs misty' }));
    await user.click(screen.getByRole('button', { name: '↩ Deshacer resultado' }));

    await waitFor(() => expect(api.revertMatchResult).toHaveBeenCalledWith('league-1', 'm1'));
  });

  it('el modal de corregir es un diálogo: Escape lo cierra y devuelve el foco al botón', async () => {
    useAuthStore.setState({ username: 'ash' });
    const user = userEvent.setup();
    renderPage();

    const opener = await screen.findByRole('button', { name: 'Corregir resultado ash vs misty' });
    await user.click(opener);
    const dialog = screen.getByRole('dialog', { name: 'Corregir resultado' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveFocus();
    await user.tab({ shift: true });
    expect(dialog).toContainElement(document.activeElement as HTMLElement);

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
  });

  it('mientras se deshace el resultado, Escape no cierra el modal', async () => {
    useAuthStore.setState({ username: 'ash' });
    api.revertMatchResult.mockReturnValue(new Promise(() => {}));
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: 'Corregir resultado ash vs misty' }));
    await user.click(screen.getByRole('button', { name: '↩ Deshacer resultado' }));
    await user.keyboard('{Escape}');

    expect(screen.getByRole('dialog', { name: 'Corregir resultado' })).toBeInTheDocument();
  });

  it('only completed matches can be corrected, and only by admins', async () => {
    useAuthStore.setState({ username: 'ash' });
    const { unmount } = renderPage();
    await screen.findByRole('button', { name: 'Corregir resultado ash vs misty' });
    expect(screen.queryByRole('button', { name: 'Corregir resultado brock vs misty' })).not.toBeInTheDocument();
    unmount();

    useAuthStore.setState({ username: 'misty' });
    renderPage();
    await screen.findAllByText('brock');
    expect(screen.queryByRole('button', { name: /Corregir resultado/ })).not.toBeInTheDocument();
  });
});

describe('SchedulePage — marcador', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ username: 'ash' });
    api.getLeagueDetail.mockResolvedValue(LEAGUE);
    api.getSchedule.mockResolvedValue(SCHEDULE);
    api.getMyCoinBalance.mockResolvedValue({ coins: 100 });
    api.correctMatchResult.mockResolvedValue(undefined);
    api.recordMatchResult.mockResolvedValue(undefined);
  });

  it('shows the score in player order instead of FIN', async () => {
    renderPage();
    // m3: brock vs ash, ganó ash 3–1 → "1–3"
    expect(await screen.findByText('1–3')).toBeInTheDocument();
    expect(screen.getByText('FIN')).toBeInTheDocument(); // m1, sin marcador
  });

  it('records a result with score', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: '▶ Resultado' }));
    await user.type(screen.getByLabelText('Marcador del ganador'), '2');
    await user.type(screen.getByLabelText('Marcador del perdedor'), '0');
    await user.click(screen.getByRole('button', { name: '✓ misty' }));

    await waitFor(() => expect(api.recordMatchResult).toHaveBeenCalledWith(
      'league-1', 'm2', 'misty', { winnerScore: 2, loserScore: 0 }));
  });

  it('blocks an invalid score', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: '▶ Resultado' }));
    await user.type(screen.getByLabelText('Marcador del ganador'), '1');
    await user.type(screen.getByLabelText('Marcador del perdedor'), '2');

    expect(screen.getByRole('alert')).toHaveTextContent('El ganador debe tener más que el perdedor.');
    expect(screen.getByRole('button', { name: '✓ misty' })).toBeDisabled();
  });

  it('corrects only the score, keeping the winner', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: 'Corregir resultado brock vs ash' }));
    const saveScore = screen.getByRole('button', { name: '✓ Guardar marcador' });
    expect(screen.getByLabelText('Marcador del ganador')).toHaveValue(3);
    expect(saveScore).toBeDisabled(); // sin cambios

    await user.clear(screen.getByLabelText('Marcador del perdedor'));
    await user.type(screen.getByLabelText('Marcador del perdedor'), '2');
    await user.click(saveScore);

    await waitFor(() => expect(api.correctMatchResult).toHaveBeenCalledWith(
      'league-1', 'm3', 'ash', { winnerScore: 3, loserScore: 2 }));
  });
});

describe('SchedulePage — jornadas', () => {
  const SEASON: ScheduleResponse = {
    leagueId: 'league-1',
    stealWindowOpen: false,
    swapWindowOpen: true,
    jornadas: [
      {
        roundNumber: 1,
        startDate: '2026-05-22',
        matches: [
          { id: 'j1a', player1: 'ash', player2: 'misty', winnerUsername: 'ash', status: 'COMPLETED',
            winnerScore: 6, loserScore: 0 },
        ],
      },
      {
        roundNumber: 2,
        startDate: '2026-05-29',
        swapDeadline: '2026-06-05T16:00:00',
        matches: [
          { id: 'j2a', player1: 'misty', player2: 'brock', status: 'PENDING' },
          { id: 'j2b', player1: 'ash', player2: 'gary', winnerUsername: 'gary', status: 'COMPLETED' },
        ],
      },
      {
        roundNumber: 3,
        startDate: '2026-06-05',
        matches: [{ id: 'j3a', player1: 'brock', player2: 'ash', status: 'PENDING' }],
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ username: 'ash' });
    api.getLeagueDetail.mockResolvedValue(LEAGUE);
    api.getSchedule.mockResolvedValue(SEASON);
    api.getMyCoinBalance.mockResolvedValue({ coins: 100 });
  });

  it('las jornadas jugadas salen plegadas con tu resultado y se despliegan', async () => {
    const user = userEvent.setup();
    renderPage();

    const toggle = await screen.findByRole('button', { name: /Jornada 1/ });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(toggle).toHaveAccessibleName('Jornada 1 · Primera vuelta, vie 22 may, Ganaste a misty 6–0');
    expect(toggle).toHaveTextContent('vie 22 may');
    expect(toggle).toHaveTextContent('Ganaste a misty 6–0');
    expect(screen.queryByRole('button', { name: 'Corregir resultado ash vs misty' })).not.toBeInTheDocument();

    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('button', { name: 'Corregir resultado ash vs misty' })).toBeInTheDocument();
  });

  it('destaca la jornada actual y la muestra desplegada', async () => {
    renderPage();
    const current = await screen.findByRole('region', { name: /Jornada 2/ });
    expect(current).toHaveTextContent('Jornada actual');
    expect(current).toHaveTextContent('vie 29 may');
    expect(screen.getByRole('button', { name: 'Corregir resultado ash vs gary' })).toBeInTheDocument();
  });

  it('muestra el estado del mercado y tu próximo partido', async () => {
    renderPage();
    expect(await screen.findByRole('status', { name: 'Estado del mercado' })).toHaveTextContent('Intercambios y banquillo');
    expect(screen.getByText('Tu próximo partido').parentElement).toHaveTextContent('Jornada 3 · contra brock · vie 5 jun');
  });

  it('resalta tus partidos', async () => {
    renderPage();
    const mine = await screen.findByTestId('match-j2b');
    expect(mine).toHaveClass('mine');
    expect(screen.getByTestId('match-j2a')).not.toHaveClass('mine');
  });
});

describe('SchedulePage — jugar en Showdown', () => {
  const PLAYABLE: ScheduleResponse = {
    leagueId: 'league-1',
    stealWindowOpen: false,
    swapWindowOpen: false,
    jornadas: [{
      roundNumber: 1,
      matches: [
        { id: 'p1', player1: 'ash', player2: 'misty', status: 'PENDING' },
        { id: 'p2', player1: 'brock', player2: 'gary', status: 'PENDING' },
        { id: 'p3', player1: 'misty', player2: 'brock', winnerUsername: 'misty', status: 'COMPLETED' },
      ],
    }],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ username: 'misty' });
    api.getLeagueDetail.mockResolvedValue({
      ...LEAGUE,
      members: [
        { username: 'ash', leagueRole: 'ADMIN', showdownName: 'Ash Ketchum' },
        { username: 'misty', leagueRole: 'USER', showdownName: 'Misty Cerulean' },
      ],
    });
    api.getSchedule.mockResolvedValue(PLAYABLE);
    api.getMyCoinBalance.mockResolvedValue({ coins: 100 });
  });

  it('solo en mis partidos pendientes, aunque no sea admin', async () => {
    renderPage();

    const mine = await screen.findByTestId('match-p1');
    expect(within(mine).getByRole('button', { name: 'Jugar en Showdown' })).toBeInTheDocument();
    expect(within(screen.getByTestId('match-p2')).queryByRole('button', { name: 'Jugar en Showdown' }))
      .not.toBeInTheDocument();
    expect(within(screen.getByTestId('match-p3')).queryByRole('button', { name: 'Jugar en Showdown' }))
      .not.toBeInTheDocument();
  });

  it('abre el modal con el reto al nombre de Showdown del rival', async () => {
    renderPage();
    const user = userEvent.setup();

    await user.click(within(await screen.findByTestId('match-p1')).getByRole('button', { name: 'Jugar en Showdown' }));

    expect(screen.getByRole('dialog', { name: 'Jugar en Showdown' })).toBeInTheDocument();
    expect(screen.getByText(/^\/challenge Ash Ketchum, /)).toBeInTheDocument();
  });
});

describe('SchedulePage — alineación', () => {
  const MISTY_PICKS = ['starmie', 'psyduck', 'goldeen', 'staryu', 'horsea', 'lapras'].map((pokemonName, i) => ({
    username: 'misty', pokemonName, pokemonId: 100 + i, round: 1, pickedAt: '2026-01-01T00:00:00Z',
  }));
  const DRAFT = { status: 'COMPLETED', turnOrder: ['ash', 'misty'], picks: MISTY_PICKS } as unknown as pokemonsApi.DraftStatus;

  function scheduleWith(match: Partial<ScheduleResponse['jornadas'][0]['matches'][0]>, lineupOpensAt?: string) {
    return {
      leagueId: 'league-1', stealWindowOpen: false, swapWindowOpen: false,
      jornadas: [{ roundNumber: 1, lineupOpensAt, matches: [
        { id: 'p1', player1: 'ash', player2: 'misty', status: 'PENDING' as const, ...match },
      ] }],
    } satisfies ScheduleResponse;
  }

  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ username: 'misty' });
    api.getLeagueDetail.mockResolvedValue(LEAGUE);
    api.getMyCoinBalance.mockResolvedValue({ coins: 100 });
    vi.mocked(pokemonsApi.getDraftStatus).mockResolvedValue(DRAFT);
  });

  it('con el periodo abierto ofrece declararla y abre el modal con mi equipo', async () => {
    api.getSchedule.mockResolvedValue(scheduleWith({ lineupOpen: true }));
    renderPage();
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Declarar alineación' }));

    expect(await screen.findByRole('dialog', { name: 'Declarar alineación' })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'starmie' })).toBeInTheDocument();
  });

  it('enviada y sin la del rival: se puede cambiar y se espera al rival', async () => {
    api.getSchedule.mockResolvedValue(scheduleWith({
      lineupOpen: true, player2LineupSubmitted: true, player2Lineup: { pokemonNames: ['starmie'] },
    }));
    renderPage();

    expect(await screen.findByRole('button', { name: 'Cambiar alineación' })).toBeInTheDocument();
    expect(screen.getByText('Esperando la alineación de ash')).toBeInTheDocument();
  });

  it('el rival ya la envió', async () => {
    api.getSchedule.mockResolvedValue(scheduleWith({ lineupOpen: true, player1LineupSubmitted: true }));
    renderPage();

    expect(await screen.findByText('ash ya ha enviado su alineación')).toBeInTheDocument();
  });

  it('antes del cierre del mercado dice desde cuándo', async () => {
    api.getSchedule.mockResolvedValue(scheduleWith({ lineupPending: true }, '2099-06-05T16:00:00'));
    renderPage();

    expect(await screen.findByText('Podrás declarar tu alineación desde vie 5 jun, 16:00')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Declarar alineación' })).not.toBeInTheDocument();
  });

  it('"Copiar mi equipo" en Showdown copia solo la alineación declarada', async () => {
    api.getLeagueDetail.mockResolvedValue({
      ...LEAGUE,
      members: [
        { username: 'ash', leagueRole: 'ADMIN', showdownName: 'Ash Ketchum' },
        { username: 'misty', leagueRole: 'USER', showdownName: 'Misty Cerulean' },
      ],
    });
    api.getSchedule.mockResolvedValue(scheduleWith({
      player2LineupSubmitted: true, player2Lineup: { pokemonNames: ['starmie', 'lapras'] },
    }));
    renderPage();
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Jugar en Showdown' }));
    const copy = await screen.findByRole('button', { name: 'Copiar mi equipo' });
    await waitFor(() => expect(copy).toBeEnabled());
    await user.click(copy);

    expect(Clipboard.write).toHaveBeenCalledWith({ string: 'Starmie\n\nLapras' });
  });
});

describe('SchedulePage — alineación (errores y jornadas futuras)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ username: 'misty' });
    useToastStore.setState({ toasts: [] });
    api.getLeagueDetail.mockResolvedValue(LEAGUE);
    api.getMyCoinBalance.mockResolvedValue({ coins: 100 });
    vi.mocked(pokemonsApi.getDraftStatus).mockResolvedValue(null);
  });

  function schedule(match: Partial<ScheduleResponse['jornadas'][0]['matches'][0]>) {
    return {
      leagueId: 'league-1', stealWindowOpen: false, swapWindowOpen: false,
      jornadas: [{ roundNumber: 1, lineupOpensAt: '2099-06-05T16:00:00', matches: [
        { id: 'p1', player1: 'ash', player2: 'misty', status: 'PENDING' as const, ...match },
      ] }],
    } satisfies ScheduleResponse;
  }

  it('sin lineupPending del backend no promete una fecha', async () => {
    api.getSchedule.mockResolvedValue(schedule({}));
    renderPage();

    await screen.findByTestId('match-p1');
    expect(screen.queryByText(/Podrás declarar tu alineación/)).not.toBeInTheDocument();
  });

  it('si no se pueden cargar los ajustes al abrir la alineación, avisa', async () => {
    api.getSchedule.mockResolvedValue(schedule({ lineupOpen: true }));
    api.getLeagueSettings.mockRejectedValueOnce(new Error('caído'));
    renderPage();
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Declarar alineación' }));

    await waitFor(() => expect(useToastStore.getState().toasts.at(-1)).toMatchObject({
      type: 'error', message: 'No se pudieron cargar los ajustes de la liga. Inténtalo de nuevo.',
    }));
    expect(screen.queryByRole('dialog', { name: 'Declarar alineación' })).not.toBeInTheDocument();
  });
});
