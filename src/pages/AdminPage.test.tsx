import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import AdminPage from './AdminPage';
import * as adminApi from '../api/admin';
import * as authApi from '../api/auth';
import { useToastStore } from '../store/toastStore';

vi.mock('../api/admin', () => ({
  searchUsers: vi.fn(),
  searchLeagues: vi.fn(),
  removeAvatar: vi.fn(),
  renameLeague: vi.fn(),
  deleteUser: vi.fn(),
}));
vi.mock('../api/auth', async (importOriginal) => ({ ...(await importOriginal<typeof authApi>()), getMe: vi.fn() }));

const api = vi.mocked(adminApi);

function renderPage() {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}>
      <MemoryRouter initialEntries={['/admin']}>
        <Routes>
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/" element={<p>home page</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('AdminPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useToastStore.setState({ toasts: [] });
    vi.mocked(authApi.getMe).mockResolvedValue({ username: 'root', avatarVersion: null, admin: true });
    api.searchUsers.mockResolvedValue([
      { username: 'troll', avatarVersion: 3, admin: false },
      { username: 'trollboss', avatarVersion: null, admin: true },
    ]);
    api.searchLeagues.mockResolvedValue([{ id: 'l1', name: 'Insulto', members: 2 }]);
  });

  it('redirects non admins to /', async () => {
    vi.mocked(authApi.getMe).mockResolvedValue({ username: 'ash', avatarVersion: null, admin: false });
    renderPage();

    expect(await screen.findByText('home page')).toBeInTheDocument();
  });

  it('searches users and removes a photo after confirming', async () => {
    const user = userEvent.setup();
    api.removeAvatar.mockResolvedValue();
    renderPage();

    await user.type(await screen.findByLabelText('Buscar usuarios'), 'tro');
    const row = (await screen.findByText('troll')).closest('li') as HTMLElement;
    await user.click(within(row).getByRole('button', { name: 'Quitar foto de troll' }));
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Quitar foto' }));

    await waitFor(() => expect(api.removeAvatar).toHaveBeenCalledWith('troll'));
    expect(useToastStore.getState().toasts.map((t) => t.message)).toContain('Foto de troll quitada');
  });

  it('does not offer deleting another admin, nor removing a photo that does not exist', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(await screen.findByLabelText('Buscar usuarios'), 'tro');
    const row = (await screen.findByText('trollboss')).closest('li') as HTMLElement;
    expect(within(row).queryByRole('button', { name: 'Borrar cuenta de trollboss' })).not.toBeInTheDocument();
    expect(within(row).queryByRole('button', { name: 'Quitar foto de trollboss' })).not.toBeInTheDocument();
  });

  it('deletes a user after confirming', async () => {
    const user = userEvent.setup();
    api.deleteUser.mockResolvedValue();
    renderPage();

    await user.type(await screen.findByLabelText('Buscar usuarios'), 'tro');
    const row = (await screen.findByText('troll')).closest('li') as HTMLElement;
    await user.click(within(row).getByRole('button', { name: 'Borrar cuenta de troll' }));
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Borrar cuenta' }));

    await waitFor(() => expect(api.deleteUser).toHaveBeenCalledWith('troll'));
  });

  it('renames a league and rejects 41 characters', async () => {
    const user = userEvent.setup();
    api.renameLeague.mockResolvedValue();
    renderPage();

    await user.type(await screen.findByLabelText('Buscar ligas'), 'insu');
    const row = (await screen.findByText('Insulto')).closest('li') as HTMLElement;
    await user.click(within(row).getByRole('button', { name: 'Renombrar Insulto' }));
    const dialog = screen.getByRole('dialog', { name: 'Renombrar liga' });
    const input = within(dialog).getByLabelText('Nuevo nombre');
    await user.clear(input);
    await user.type(input, 'x'.repeat(41));
    expect(within(dialog).getByRole('button', { name: 'Guardar' })).toBeDisabled();
    expect(within(dialog).getByText('El nombre de la liga debe tener entre 1 y 40 caracteres.')).toBeInTheDocument();

    await user.clear(input);
    await user.type(input, 'Kanto');
    await user.click(within(dialog).getByRole('button', { name: 'Guardar' }));

    await waitFor(() => expect(api.renameLeague).toHaveBeenCalledWith('l1', 'Kanto'));
  });

  it('does not search with less than 2 characters', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(await screen.findByLabelText('Buscar usuarios'), 't');
    await new Promise((r) => setTimeout(r, 400));

    expect(api.searchUsers).not.toHaveBeenCalled();
  });

  it('shows an error when a search fails, without looking like an empty result', async () => {
    const user = userEvent.setup();
    api.searchUsers.mockRejectedValue(Object.assign(new Error('500'), {
      isAxiosError: true, response: { status: 500, data: { code: 'INTERNAL_ERROR', message: 'Error interno del servidor' } },
    }));
    renderPage();

    await user.type(await screen.findByLabelText('Buscar usuarios'), 'tro');

    expect(await screen.findByText(/No se ha podido buscar/)).toBeInTheDocument();
    expect(screen.queryByText('Sin resultados')).not.toBeInTheDocument();
  });

  it('says when there are no results', async () => {
    const user = userEvent.setup();
    api.searchLeagues.mockResolvedValue([]);
    renderPage();

    await user.type(await screen.findByLabelText('Buscar ligas'), 'zzz');

    expect(await screen.findByText('Sin resultados')).toBeInTheDocument();
  });
});
