import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AxiosError, AxiosHeaders } from 'axios';
import ShowdownAccountSection from './ShowdownAccountSection';
import * as authApi from '../api/auth';
import { useToastStore } from '../store/toastStore';

vi.mock('../api/auth', async (importOriginal) => ({
  ...(await importOriginal<typeof authApi>()),
  linkShowdown: vi.fn(),
  unlinkShowdown: vi.fn(),
}));
const mockedLink = vi.mocked(authApi.linkShowdown);
const mockedUnlink = vi.mocked(authApi.unlinkShowdown);

function renderSection(showdownName: string | null) {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  const invalidate = vi.spyOn(client, 'invalidateQueries');
  render(
    <QueryClientProvider client={client}>
      <ShowdownAccountSection showdownName={showdownName} />
    </QueryClientProvider>
  );
  return invalidate;
}

function lastToast() {
  return useToastStore.getState().toasts.at(-1);
}

describe('ShowdownAccountSection', () => {
  beforeEach(() => {
    mockedLink.mockReset();
    mockedUnlink.mockReset();
    useToastStore.setState({ toasts: [] });
  });

  it('sin cuenta vinculada: botón deshabilitado con el campo vacío y ayuda visible', () => {
    renderSection(null);

    expect(screen.getByLabelText('Nombre en Showdown')).toHaveValue('');
    expect(screen.getByRole('button', { name: 'Vincular' })).toBeDisabled();
    expect(screen.getByText(
      'Tiene que ser una cuenta registrada en Showdown. Se usa para retar a tu rival e importar los resultados.'
    )).toBeInTheDocument();
  });

  it('vincula el nombre escrito, refresca el usuario y los miembros y avisa', async () => {
    mockedLink.mockResolvedValue(undefined);
    const invalidate = renderSection(null);
    const user = userEvent.setup();

    await user.type(screen.getByLabelText('Nombre en Showdown'), 'Ash');
    await user.click(screen.getByRole('button', { name: 'Vincular' }));

    await waitFor(() => expect(mockedLink).toHaveBeenCalledWith('Ash'));
    await waitFor(() => expect(lastToast()?.type).toBe('success'));
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['me'] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['league-detail'] });
  });

  it('si falla, muestra el mensaje del backend', async () => {
    mockedLink.mockRejectedValue(new AxiosError('x', '400', undefined, undefined, {
      status: 400, statusText: '', headers: {}, config: { headers: new AxiosHeaders() },
      data: { message: "No existe una cuenta registrada en Showdown con el nombre 'Ghost'." },
    }));
    renderSection(null);
    const user = userEvent.setup();

    await user.type(screen.getByLabelText('Nombre en Showdown'), 'Ghost');
    await user.click(screen.getByRole('button', { name: 'Vincular' }));

    await waitFor(() => expect(lastToast()).toMatchObject({
      type: 'error', message: "No existe una cuenta registrada en Showdown con el nombre 'Ghost'.",
    }));
  });

  it('con cuenta vinculada: muestra el nombre y desvincula', async () => {
    mockedUnlink.mockResolvedValue(undefined);
    renderSection('Ash Ketchum');
    const user = userEvent.setup();

    expect(screen.getByText('Ash Ketchum')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Desvincular' }));

    await waitFor(() => expect(mockedUnlink).toHaveBeenCalled());
  });
});
