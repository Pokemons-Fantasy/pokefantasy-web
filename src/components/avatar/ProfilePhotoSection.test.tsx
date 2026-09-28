import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ProfilePhotoSection from './ProfilePhotoSection';
import * as authApi from '../../api/auth';
import { useToastStore } from '../../store/toastStore';

vi.mock('../../api/auth', async (importOriginal) => ({
  ...(await importOriginal<typeof authApi>()),
  getMe: vi.fn(),
  deleteAvatar: vi.fn(),
}));
vi.mock('./AvatarEditorModal', () => ({
  default: ({ file, onClose }: { file: File; onClose: () => void }) => (
    <div role="dialog" aria-label="editor">
      {file.name}
      <button type="button" onClick={onClose}>cerrar editor</button>
    </div>
  ),
}));

const mockedMe = vi.mocked(authApi.getMe);
const mockedDelete = vi.mocked(authApi.deleteAvatar);

function renderSection() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
  const view = render(
    <QueryClientProvider client={queryClient}>
      <ProfilePhotoSection username="ash" />
    </QueryClientProvider>,
  );
  return { ...view, invalidate };
}

describe('ProfilePhotoSection', () => {
  beforeEach(() => {
    mockedMe.mockReset();
    mockedDelete.mockReset().mockResolvedValue(undefined);
    useToastStore.setState({ toasts: [] });
  });

  it('without a photo offers to upload one and shows the initial', async () => {
    mockedMe.mockResolvedValue({ username: 'ash', avatarVersion: null });
    const { container } = renderSection();

    expect(await screen.findByRole('button', { name: 'Subir foto' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Quitar foto' })).toBeNull();
    expect(container.querySelector('img')).toBeNull();
  });

  it('with a photo shows it and offers to change or remove it', async () => {
    mockedMe.mockResolvedValue({ username: 'ash', avatarVersion: 42 });
    const { container } = renderSection();

    expect(await screen.findByRole('button', { name: 'Cambiar foto' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Quitar foto' })).toBeInTheDocument();
    expect(container.querySelector('img')).toHaveAttribute('src', '/api/v1/users/ash/avatar?v=42');
  });

  it('opens the editor with the chosen image and returns focus when it closes', async () => {
    mockedMe.mockResolvedValue({ username: 'ash', avatarVersion: null });
    const user = userEvent.setup();
    renderSection();
    await screen.findByRole('button', { name: 'Subir foto' });

    await user.upload(screen.getByLabelText('Elegir foto de perfil'), new File(['x'], 'me.png', { type: 'image/png' }));

    expect(screen.getByRole('dialog', { name: 'editor' })).toHaveTextContent('me.png');
    await user.click(screen.getByRole('button', { name: 'cerrar editor' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByRole('button', { name: 'Subir foto' })).toHaveFocus();
  });

  it('rejects a non-image file with a toast', async () => {
    mockedMe.mockResolvedValue({ username: 'ash', avatarVersion: null });
    const user = userEvent.setup({ applyAccept: false });
    renderSection();
    await screen.findByRole('button', { name: 'Subir foto' });

    await user.upload(screen.getByLabelText('Elegir foto de perfil'), new File(['x'], 'cv.pdf', { type: 'application/pdf' }));

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(useToastStore.getState().toasts.at(-1)).toMatchObject({ type: 'error' });
  });

  it('removes the photo after confirming', async () => {
    mockedMe.mockResolvedValue({ username: 'ash', avatarVersion: 42 });
    const user = userEvent.setup();
    const { invalidate } = renderSection();

    await user.click(await screen.findByRole('button', { name: 'Quitar foto' }));
    expect(mockedDelete).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Sí, quitar' }));

    await waitFor(() => expect(mockedDelete).toHaveBeenCalled());
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['me'] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['league-detail'] });
  });

  it('can cancel the removal', async () => {
    mockedMe.mockResolvedValue({ username: 'ash', avatarVersion: 42 });
    const user = userEvent.setup();
    renderSection();

    await user.click(await screen.findByRole('button', { name: 'Quitar foto' }));
    await user.click(screen.getByRole('button', { name: 'No' }));

    expect(screen.getByRole('button', { name: 'Quitar foto' })).toBeInTheDocument();
    expect(mockedDelete).not.toHaveBeenCalled();
  });
});
