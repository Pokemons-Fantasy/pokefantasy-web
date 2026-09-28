import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import LeagueMembersPage from './LeagueMembersPage';
import { useAuthStore } from '../store/authStore';
import { useToastStore } from '../store/toastStore';
import * as leaguesApi from '../api/leagues';
import * as pokemonsApi from '../api/pokemons';
import type { LeagueDetail, LeagueMember } from '../api/leagues';

vi.mock('../api/leagues', async (importOriginal) => ({
  ...(await importOriginal<typeof leaguesApi>()),
  getLeagueDetail: vi.fn(),
  removeMember: vi.fn(),
  promoteToAdmin: vi.fn(),
  searchUsers: vi.fn(),
}));
vi.mock('../api/pokemons', async (importOriginal) => ({
  ...(await importOriginal<typeof pokemonsApi>()),
  getDraftStatus: vi.fn(),
  startDraft: vi.fn(),
}));

const leagueDetail = vi.mocked(leaguesApi.getLeagueDetail);
const removeMember = vi.mocked(leaguesApi.removeMember);
const promoteToAdmin = vi.mocked(leaguesApi.promoteToAdmin);
const draftStatus = vi.mocked(pokemonsApi.getDraftStatus);
const startDraft = vi.mocked(pokemonsApi.startDraft);

const member = (username: string, leagueRole: LeagueMember['leagueRole'] = 'USER'): LeagueMember =>
  ({ username, leagueRole });
const league = (...members: LeagueMember[]): LeagueDetail =>
  ({ id: 'l1', name: 'Liga', createdBy: 'ash', status: 'SETUP', members });

function renderPage() {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={['/leagues/l1/members']}>
        <Routes>
          <Route path="/leagues/:leagueId/members" element={<LeagueMembersPage />} />
          <Route path="/leagues/:leagueId/draft" element={<p>Pantalla del draft</p>} />
          <Route path="/leagues" element={<p>Mis ligas</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

const openMenu = async (username: string) => {
  await userEvent.click(await screen.findByRole('button', { name: `Opciones de ${username}` }));
};

describe('LeagueMembersPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ username: 'ash' });
    useToastStore.setState({ toasts: [] });
    leagueDetail.mockResolvedValue(league(member('ash', 'ADMIN'), member('misty')));
    draftStatus.mockResolvedValue(null);
    removeMember.mockResolvedValue(undefined);
    promoteToAdmin.mockResolvedValue(undefined);
    startDraft.mockResolvedValue(undefined);
  });

  it('muestra el rol una sola vez y marca tu fila', async () => {
    renderPage();

    await screen.findByRole('button', { name: 'Opciones de misty' });
    expect(screen.getAllByText('Admin')).toHaveLength(1);
    expect(screen.getByText('Tú')).toBeInTheDocument();
    expect(screen.queryByText('Jugador')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Expulsar' })).not.toBeInTheDocument();
  });

  it('el admin expulsa desde el menú de la fila tras confirmar', async () => {
    renderPage();

    await openMenu('misty');
    await userEvent.click(screen.getByRole('button', { name: 'Expulsar' }));
    const dialog = screen.getByRole('alertdialog', { name: '¿Expulsar a misty?' });
    expect(within(dialog).getByRole('button', { name: 'Cancelar' })).toHaveFocus();

    await userEvent.click(within(dialog).getByRole('button', { name: 'Expulsar' }));

    await waitFor(() => expect(removeMember).toHaveBeenCalledWith('l1', 'misty'));
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
  });

  it('Cancelar cierra la confirmación sin expulsar y devuelve el foco al menú de la fila', async () => {
    renderPage();

    await openMenu('misty');
    await userEvent.click(screen.getByRole('button', { name: 'Expulsar' }));
    await userEvent.keyboard('{Escape}');

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Opciones de misty' })).toHaveFocus();
    expect(removeMember).not.toHaveBeenCalled();
  });

  it('el error al expulsar sale en un aviso con el mensaje del servidor', async () => {
    removeMember.mockRejectedValue({ response: { data: { message: 'La liga no puede quedarse sin admin' } } });
    renderPage();

    await openMenu('misty');
    await userEvent.click(screen.getByRole('button', { name: 'Expulsar' }));
    await userEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Expulsar' }));

    await waitFor(() => expect(useToastStore.getState().toasts).toEqual([
      expect.objectContaining({ type: 'error', message: 'La liga no puede quedarse sin admin' }),
    ]));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('el admin hace admin a un jugador', async () => {
    renderPage();

    await openMenu('misty');
    await userEvent.click(screen.getByRole('button', { name: 'Hacer admin' }));
    await userEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Hacer admin' }));

    await waitFor(() => expect(promoteToAdmin).toHaveBeenCalledWith('l1', 'misty'));
  });

  it('a otro admin no se le ofrece hacerle admin', async () => {
    leagueDetail.mockResolvedValue(league(member('ash', 'ADMIN'), member('brock', 'ADMIN')));
    renderPage();

    await openMenu('brock');
    expect(screen.getByRole('button', { name: 'Expulsar' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Hacer admin' })).not.toBeInTheDocument();
  });

  it('el único admin no puede salir y el menú explica por qué', async () => {
    renderPage();

    await openMenu('ash');
    expect(screen.getByText(/Eres el único admin/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Salir de la liga' })).not.toBeInTheDocument();
  });

  it('un jugador solo tiene menú en su fila, y desde él sale de la liga', async () => {
    useAuthStore.setState({ username: 'misty' });
    renderPage();

    await screen.findByText('ash');
    expect(screen.queryByRole('button', { name: 'Opciones de ash' })).not.toBeInTheDocument();

    await openMenu('misty');
    await userEvent.click(screen.getByRole('button', { name: 'Salir de la liga' }));
    await userEvent.click(within(screen.getByRole('alertdialog', { name: '¿Salir de la liga?' }))
      .getByRole('button', { name: 'Salir' }));

    await waitFor(() => expect(removeMember).toHaveBeenCalledWith('l1', 'misty'));
    expect(await screen.findByText('Mis ligas')).toBeInTheDocument();
  });

  it('Escape cierra el menú y devuelve el foco al botón', async () => {
    renderPage();

    await openMenu('misty');
    expect(screen.getByRole('button', { name: 'Expulsar' })).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');

    expect(screen.queryByRole('button', { name: 'Expulsar' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Opciones de misty' })).toHaveFocus();
  });

  it('el aviso de expulsar habla de picks solo con el draft en marcha', async () => {
    draftStatus.mockResolvedValue({
      id: 'd1', status: 'IN_PROGRESS', turnOrder: ['ash', 'misty'], currentTurn: 'ash', currentRound: 1, picks: [],
    });
    renderPage();

    await openMenu('misty');
    await userEvent.click(screen.getByRole('button', { name: 'Expulsar' }));
    expect(screen.getByText(/misty perderá los picks que lleva en el draft/)).toBeInTheDocument();
  });

  it('un miembro añadido después entra al final del orden de turnos', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole('button', { name: 'Opciones de misty' });

    // El admin coloca a misty primero; luego entra brock (la liga se vuelve a cargar)
    await user.click(screen.getByRole('button', { name: 'Subir a misty' }));
    leagueDetail.mockResolvedValue(league(member('ash', 'ADMIN'), member('misty'), member('brock')));
    promoteToAdmin.mockResolvedValue(undefined);
    await openMenu('misty');
    await user.click(screen.getByRole('button', { name: 'Hacer admin' }));
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Hacer admin' }));
    await screen.findByRole('button', { name: 'Opciones de brock' });

    await user.click(screen.getByRole('button', { name: /Iniciar draft/ }));
    await waitFor(() => expect(startDraft).toHaveBeenCalledWith('l1', ['misty', 'ash', 'brock']));
  });

  it('Barajar reordena los turnos sin perder a nadie', async () => {
    const random = vi.spyOn(Math, 'random').mockReturnValue(0);
    leagueDetail.mockResolvedValue(league(member('ash', 'ADMIN'), member('misty'), member('brock')));
    renderPage();
    await screen.findByRole('button', { name: 'Opciones de brock' });

    await userEvent.click(screen.getByRole('button', { name: 'Barajar' }));
    await userEvent.click(screen.getByRole('button', { name: /Iniciar draft/ }));

    await waitFor(() => expect(startDraft).toHaveBeenCalledWith('l1', ['misty', 'brock', 'ash']));
    random.mockRestore();
  });
});
