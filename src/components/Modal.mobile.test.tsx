import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Modal from './Modal';
import { useLayoutMode } from '../hooks/useLayoutMode';
import { handleBack } from '../hooks/useBackButton';

vi.mock('../hooks/useLayoutMode', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../hooks/useLayoutMode')>()),
  useLayoutMode: vi.fn(() => 'mobile'),
}));

function renderModal({ canClose = true, onClose = vi.fn(), role }: {
  canClose?: boolean; onClose?: () => void; role?: 'dialog' | 'alertdialog';
} = {}) {
  render(
    <Modal
      labelledBy="t" describedBy="d" role={role} onClose={onClose} canClose={canClose}
      className="extra" style={{ maxWidth: 480, gap: '0.75rem' }}
    >
      <h2 id="t">Título</h2>
      <p id="d">Descripción.</p>
      <button type="button">Uno</button>
    </Modal>,
  );
  return onClose;
}

const closeOnBackdrop = (backdrop: HTMLElement) => {
  fireEvent.mouseDown(backdrop);
  fireEvent.click(backdrop);
};

describe('Modal en móvil', () => {
  beforeEach(() => vi.mocked(useLayoutMode).mockReturnValue('mobile'));

  it('es un sheet con nombre y descripción', () => {
    renderModal();
    const dialog = screen.getByRole('dialog', { name: 'Título' });
    expect(dialog).toHaveAccessibleDescription('Descripción.');
    expect(screen.getByTestId('sheet-backdrop')).toContainElement(dialog);
    const content = document.querySelector<HTMLElement>('.modal-in-sheet')!;
    expect(content).toHaveClass('modal', 'extra');
    expect(content).not.toHaveClass('animate-in-fast');
    expect(content.style.maxWidth).toBe('');
    expect(content.style.gap).toBe('0.75rem');
  });

  it('mantiene alertdialog', () => {
    renderModal({ role: 'alertdialog' });
    expect(screen.getByRole('alertdialog', { name: 'Título' })).toBeInTheDocument();
  });

  it('Escape y el fondo cierran', async () => {
    const onClose = renderModal();
    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
    closeOnBackdrop(screen.getByTestId('sheet-backdrop'));
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('con canClose a false no cierra con Escape, el fondo ni atrás', async () => {
    const onClose = renderModal({ canClose: false });
    const goBack = vi.fn();
    await userEvent.keyboard('{Escape}');
    closeOnBackdrop(screen.getByTestId('sheet-backdrop'));
    handleBack(true, goBack, vi.fn());
    expect(onClose).not.toHaveBeenCalled();
    expect(goBack).not.toHaveBeenCalled();
  });

  it('un modal abierto desde otro queda encima y se cierra solo él', async () => {
    const closeA = vi.fn();
    const closeB = vi.fn();
    render(
      <>
        <Modal labelledBy="a" onClose={closeA}><h2 id="a">Intercambios</h2></Modal>
        <Modal labelledBy="b" onClose={closeB}><h2 id="b">Ficha</h2></Modal>
      </>,
    );
    const backdrops = screen.getAllByTestId('sheet-backdrop');
    expect(within(backdrops[backdrops.length - 1]).getByRole('dialog', { name: 'Ficha' })).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    handleBack(true, vi.fn(), vi.fn());
    expect(closeB).toHaveBeenCalledTimes(2);
    expect(closeA).not.toHaveBeenCalled();
  });

  it('en escritorio sigue siendo el cuadro de siempre', () => {
    vi.mocked(useLayoutMode).mockReturnValue('desktop');
    renderModal();
    expect(screen.queryByTestId('sheet-backdrop')).not.toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Título' })).toHaveClass('modal', 'animate-in-fast', 'extra');
  });
});
