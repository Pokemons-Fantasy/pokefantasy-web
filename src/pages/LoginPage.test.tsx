import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import LoginPage, { COOKIES_BLOCKED_MESSAGE } from './LoginPage';
import * as authApi from '../api/auth';
import * as leaguesApi from '../api/leagues';
import { useAuthStore } from '../store/authStore';
import { useToastStore } from '../store/toastStore';

vi.mock('../api/auth', async (importOriginal) => ({ ...(await importOriginal<typeof authApi>()), login: vi.fn() }));
vi.mock('../api/leagues', async (importOriginal) => ({ ...(await importOriginal<typeof leaguesApi>()), getMyLeagues: vi.fn() }));

function renderLogin(from: { pathname: string; search?: string } = { pathname: '/invite/tok' }, client = newClient()) {
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[{ pathname: '/login', state: { from } }]}>
        <Routes>
          <Route path="/" element={<p>home page</p>} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/invite/:token" element={<p>invite page</p>} />
          <Route path="/leagues/:leagueId/teams" element={<p>teams page</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
  return client;
}

function newClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
}

async function submit() {
  const user = userEvent.setup();
  await user.type(screen.getByPlaceholderText('Usuario'), 'ash');
  await user.type(screen.getByPlaceholderText('Contraseña'), 'pikachu123');
  await user.click(screen.getByRole('button', { name: 'Entrar' }));
}

describe('LoginPage', () => {
  beforeEach(() => {
    useAuthStore.setState({ username: null, lastSession: null });
    useToastStore.setState({ toasts: [] });
    vi.mocked(authApi.login).mockResolvedValue({ username: 'ash' });
  });

  it('logs in and returns to the page the user wanted (the invite link)', async () => {
    vi.mocked(leaguesApi.getMyLeagues).mockResolvedValue([]);
    renderLogin();
    await submit();
    expect(await screen.findByText('invite page')).toBeInTheDocument();
    expect(useAuthStore.getState().username).toBe('ash');
  });

  it('if the browser drops the session cookie, explains it instead of looping back to login', async () => {
    vi.mocked(leaguesApi.getMyLeagues).mockRejectedValue({ response: { status: 401, data: { code: 'UNAUTHENTICATED' } } });
    renderLogin();
    await submit();
    await waitFor(() =>
      expect(useToastStore.getState().toasts.map((t) => t.message)).toContain(COOKIES_BLOCKED_MESSAGE));
    expect(useAuthStore.getState().username).toBeNull();
    expect(screen.queryByText('invite page')).not.toBeInTheDocument();
  });

  it('a network error in the check does not turn a good login into a failure', async () => {
    vi.mocked(leaguesApi.getMyLeagues).mockRejectedValue(new Error('Network Error'));
    renderLogin();
    await submit();
    expect(await screen.findByText('invite page')).toBeInTheDocument();
  });

  it('otra persona que entra en la misma pestaña va a la home, no a la página del anterior', async () => {
    vi.mocked(leaguesApi.getMyLeagues).mockResolvedValue([]);
    useAuthStore.setState({ lastSession: { user: 'misty', path: '/leagues/l1/teams' } });
    renderLogin({ pathname: '/leagues/l1/teams' });
    await submit();
    expect(await screen.findByText('home page')).toBeInTheDocument();
  });

  it('la misma persona vuelve a donde terminó su sesión', async () => {
    vi.mocked(leaguesApi.getMyLeagues).mockResolvedValue([]);
    useAuthStore.setState({ lastSession: { user: 'ash', path: '/leagues/l1/teams' } });
    renderLogin({ pathname: '/leagues/l1/teams' });
    await submit();
    expect(await screen.findByText('teams page')).toBeInTheDocument();
  });

  it('vacía la caché al entrar: nada de los datos de la cuenta anterior', async () => {
    vi.mocked(leaguesApi.getMyLeagues).mockResolvedValue([]);
    const client = newClient();
    client.setQueryData(['my-coins', 'l1'], { coins: 999 });
    renderLogin(undefined, client);
    await submit();
    await screen.findByText('invite page');
    expect(client.getQueryData(['my-coins', 'l1'])).toBeUndefined();
    expect(client.getQueryData(['my-leagues'])).toEqual([]); // la comprobación de cookie sí queda
  });
});
