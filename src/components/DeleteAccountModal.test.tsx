import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import DeleteAccountModal from './DeleteAccountModal';
import * as authApi from '../api/auth';
import { useAuthStore } from '../store/authStore';
import { useToastStore } from '../store/toastStore';

vi.mock('../api/auth', async (importOriginal) => ({
  ...(await importOriginal<typeof authApi>()),
  deleteAccount: vi.fn(),
}));
const deleteAccount = vi.mocked(authApi.deleteAccount);

function renderModal(onClose = vi.fn()) {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/profile']}>
        <Routes>
          <Route path="/profile" element={<DeleteAccountModal onClose={onClose} />} />
          <Route path="/login" element={<p>login page</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
  return onClose;
}

describe('DeleteAccountModal', () => {
  beforeEach(() => {
    deleteAccount.mockReset();
    useAuthStore.setState({ username: 'ash', lastSession: null });
    useToastStore.setState({ toasts: [] });
  });

  it('deletes the account with the password, clears the session and goes to /login', async () => {
    deleteAccount.mockResolvedValue();
    const user = userEvent.setup();
    renderModal();

    expect(screen.getByRole('dialog', { name: 'Borrar cuenta' })).toBeInTheDocument();
    await user.type(screen.getByLabelText('Contraseña'), 'pikachu123');
    await user.click(screen.getByRole('button', { name: 'Borrar mi cuenta' }));

    await waitFor(() => expect(screen.getByText('login page')).toBeInTheDocument());
    expect(deleteAccount).toHaveBeenCalledWith('pikachu123');
    expect(useAuthStore.getState().username).toBeNull();
    expect(useAuthStore.getState().lastSession).toBeNull();
    expect(useToastStore.getState().toasts.map((t) => t.message)).toContain('Cuenta borrada');
  });

  it('keeps the modal open and shows the error on a wrong password', async () => {
    deleteAccount.mockRejectedValue(Object.assign(new Error('401'), {
      isAxiosError: true,
      response: { status: 401, data: { code: 'INVALID_CREDENTIALS', message: 'La contraseña no es correcta.' } },
    }));
    const user = userEvent.setup();
    renderModal();

    await user.type(screen.getByLabelText('Contraseña'), 'mala');
    await user.click(screen.getByRole('button', { name: 'Borrar mi cuenta' }));

    await waitFor(() => expect(useToastStore.getState().toasts).toHaveLength(1));
    expect(useToastStore.getState().toasts[0].type).toBe('error');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(useAuthStore.getState().username).toBe('ash');
  });

  it('cannot submit without a password', () => {
    renderModal();

    expect(screen.getByRole('button', { name: 'Borrar mi cuenta' })).toBeDisabled();
  });

  it('closes with Escape', async () => {
    const user = userEvent.setup();
    const onClose = renderModal();

    await user.keyboard('{Escape}');

    expect(onClose).toHaveBeenCalled();
  });
});
