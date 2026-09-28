import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useEffect } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AvatarEditorModal from './AvatarEditorModal';
import * as authApi from '../../api/auth';
import * as cropImage from './cropImage';
import { useToastStore } from '../../store/toastStore';

const PIXELS = { x: 10, y: 20, width: 300, height: 300 };

vi.mock('react-easy-crop', () => ({
  default: function CropperMock({ onCropComplete }: {
    onCropComplete: (a: object, p: object) => void;
  }) {
    useEffect(() => {
      onCropComplete({ x: 0, y: 0, width: 50, height: 50 }, PIXELS);
    }, [onCropComplete]);
    return <div data-testid="cropper" />;
  },
}));
vi.mock('./cropImage', () => ({ loadImage: vi.fn(), cropToJpeg: vi.fn() }));
vi.mock('../../api/auth', async (importOriginal) => ({
  ...(await importOriginal<typeof authApi>()),
  uploadAvatar: vi.fn(),
}));

const mockedLoad = vi.mocked(cropImage.loadImage);
const mockedCrop = vi.mocked(cropImage.cropToJpeg);
const mockedUpload = vi.mocked(authApi.uploadAvatar);
const IMAGE = {} as HTMLImageElement;
const BLOB = new Blob(['jpeg'], { type: 'image/jpeg' });

function renderEditor(onClose = vi.fn()) {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
  render(
    <QueryClientProvider client={queryClient}>
      <AvatarEditorModal file={new File(['x'], 'me.jpg', { type: 'image/jpeg' })} onClose={onClose} />
    </QueryClientProvider>,
  );
  return { onClose, invalidate };
}

describe('AvatarEditorModal', () => {
  beforeEach(() => {
    URL.createObjectURL = vi.fn(() => 'blob:photo');
    URL.revokeObjectURL = vi.fn();
    mockedLoad.mockReset().mockResolvedValue(IMAGE);
    mockedCrop.mockReset().mockResolvedValue(BLOB);
    mockedUpload.mockReset().mockResolvedValue(42);
    useToastStore.setState({ toasts: [] });
  });
  afterEach(() => vi.restoreAllMocks());

  it('is an accessible dialog with a zoom control', async () => {
    renderEditor();

    expect(await screen.findByRole('dialog', { name: 'Encuadra tu foto' })).toBeInTheDocument();
    expect(await screen.findByLabelText('Zoom')).toHaveValue('1');
    expect(screen.getByTestId('cropper')).toBeInTheDocument();
  });

  it('saves the cropped JPEG and refreshes every view', async () => {
    const user = userEvent.setup();
    const { onClose, invalidate } = renderEditor();
    await screen.findByTestId('cropper');

    await user.click(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(mockedCrop).toHaveBeenCalledWith(IMAGE, PIXELS);
    expect(mockedUpload).toHaveBeenCalledWith(BLOB);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['me'] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['league-detail'] });
    expect(useToastStore.getState().toasts.at(-1)?.type).toBe('success');
  });

  it('keeps the editor open and shows the error when the upload fails', async () => {
    mockedUpload.mockRejectedValue({ response: { data: { message: 'La imagen debe ser JPEG' } } });
    const user = userEvent.setup();
    const { onClose } = renderEditor();
    await screen.findByTestId('cropper');

    await user.click(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(() => expect(useToastStore.getState().toasts.at(-1)?.message).toBe('La imagen debe ser JPEG'));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('shows an error when the image cannot be decoded', async () => {
    mockedLoad.mockRejectedValue(new Error('No se puede abrir esta imagen'));
    renderEditor();

    expect(await screen.findByRole('alert')).toHaveTextContent('No se puede abrir esta imagen');
    expect(screen.queryByTestId('cropper')).toBeNull();
    expect(screen.getByRole('button', { name: 'Guardar' })).toBeDisabled();
  });

  it('closes with Escape', async () => {
    const user = userEvent.setup();
    const { onClose } = renderEditor();
    await screen.findByTestId('cropper');

    await user.keyboard('{Escape}');

    expect(onClose).toHaveBeenCalled();
  });

  it('does not close when a drag that started inside ends on the backdrop', async () => {
    const { onClose } = renderEditor();
    const cropper = await screen.findByTestId('cropper');
    const backdrop = screen.getByRole('dialog').parentElement!;

    fireEvent.mouseDown(cropper);
    fireEvent.click(backdrop); // el navegador lanza el click en el ancestro común: el fondo

    expect(onClose).not.toHaveBeenCalled();
  });

  it('closes when the backdrop itself is clicked', async () => {
    const { onClose } = renderEditor();
    await screen.findByTestId('cropper');
    const backdrop = screen.getByRole('dialog').parentElement!;

    fireEvent.mouseDown(backdrop);
    fireEvent.click(backdrop);

    expect(onClose).toHaveBeenCalled();
  });

  it('revokes the object URL on unmount', async () => {
    const queryClient = new QueryClient();
    const { unmount } = render(
      <QueryClientProvider client={queryClient}>
        <AvatarEditorModal file={new File(['x'], 'me.jpg', { type: 'image/jpeg' })} onClose={vi.fn()} />
      </QueryClientProvider>,
    );
    await screen.findByTestId('cropper');

    unmount();

    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:photo');
  });
});
