import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ChangePasswordForm from './ChangePasswordForm';
import * as authApi from '../api/auth';

vi.mock('../api/auth', async (importOriginal) => ({
  ...(await importOriginal<typeof authApi>()),
  changePassword: vi.fn(),
}));
const mockedChange = vi.mocked(authApi.changePassword);

function renderForm() {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { mutations: { retry: false } } })}>
      <ChangePasswordForm />
    </QueryClientProvider>
  );
}

async function openAndFill(current: string, next: string, confirm: string) {
  const user = userEvent.setup();
  renderForm();
  await user.click(screen.getByRole('button', { name: /Cambiar contraseña/ }));
  if (current) await user.type(screen.getByLabelText('Contraseña actual'), current);
  if (next) await user.type(screen.getByLabelText('Contraseña nueva'), next);
  if (confirm) await user.type(screen.getByLabelText('Repite la contraseña nueva'), confirm);
  return user;
}

describe('ChangePasswordForm', () => {
  beforeEach(() => mockedChange.mockReset());

  it('starts collapsed', () => {
    renderForm();
    expect(screen.queryByLabelText('Contraseña actual')).not.toBeInTheDocument();
  });

  it('keeps submit disabled while the new password is invalid or does not match', async () => {
    await openAndFill('old-password', 'short', 'other');

    expect(screen.getByText('Mínimo 8 caracteres.')).toHaveClass('field-hint-error');
    expect(screen.getByText('No coincide con la contraseña nueva.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cambiar contraseña' })).toBeDisabled();
  });

  it('rejects reusing the current password', async () => {
    await openAndFill('pikachu123', 'pikachu123', 'pikachu123');

    expect(screen.getByText('Debe ser distinta de la actual.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cambiar contraseña' })).toBeDisabled();
  });

  it('submits and collapses on success', async () => {
    mockedChange.mockResolvedValue(undefined);
    const user = await openAndFill('pikachu123', 'raichu4567', 'raichu4567');

    await user.click(screen.getByRole('button', { name: 'Cambiar contraseña' }));

    await waitFor(() => expect(mockedChange).toHaveBeenCalledWith('pikachu123', 'raichu4567'));
    await waitFor(() => expect(screen.queryByLabelText('Contraseña actual')).not.toBeInTheDocument());
  });
});
