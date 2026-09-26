import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import RegisterPage from './RegisterPage';
import * as authApi from '../api/auth';

vi.mock('../api/auth', async (importOriginal) => ({
  ...(await importOriginal<typeof authApi>()),
  register: vi.fn(),
}));
const mockedRegister = vi.mocked(authApi.register);

function renderPage() {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { mutations: { retry: false } } })}>
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('RegisterPage', () => {
  beforeEach(() => mockedRegister.mockReset());

  it('shows the rules and keeps submit disabled until they are met', async () => {
    const user = userEvent.setup();
    renderPage();
    const submit = screen.getByRole('button', { name: 'Registrarse' });
    expect(screen.getByText(/3-20 caracteres/)).toBeInTheDocument();
    expect(submit).toBeDisabled();

    await user.type(screen.getByPlaceholderText('Usuario'), 'a b');
    await user.type(screen.getByPlaceholderText('Contraseña'), 'short');

    expect(screen.getByPlaceholderText('Usuario')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText(/Mínimo 8 caracteres\./)).toHaveClass('field-hint-error');
    expect(submit).toBeDisabled();
    expect(mockedRegister).not.toHaveBeenCalled();
  });

  it('submits when username and password are valid', async () => {
    mockedRegister.mockResolvedValue(undefined as never);
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByPlaceholderText('Usuario'), 'ash_k');
    await user.type(screen.getByPlaceholderText('Contraseña'), 'pikachu123');
    await user.click(screen.getByRole('button', { name: 'Registrarse' }));

    await waitFor(() => expect(mockedRegister).toHaveBeenCalledWith('ash_k', 'pikachu123'));
  });
});
