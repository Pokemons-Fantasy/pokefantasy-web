import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Modal from './Modal';

function renderModal({ canClose = true, onClose = vi.fn() } = {}) {
  render(
    <Modal labelledBy="t" onClose={onClose} canClose={canClose} className="extra" style={{ maxWidth: 480 }}>
      <h2 id="t">Título</h2>
      <button type="button">Uno</button>
      <button type="button">Dos</button>
    </Modal>,
  );
  return onClose;
}

describe('Modal', () => {
  it('es un diálogo modal con nombre, clases y foco dentro', async () => {
    renderModal();
    const dialog = screen.getByRole('dialog', { name: 'Título' });

    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveClass('modal', 'animate-in-fast', 'extra');
    expect(dialog).toHaveStyle({ maxWidth: '480px' });
    expect(dialog).toHaveFocus();
    await userEvent.tab({ shift: true });
    expect(screen.getByRole('button', { name: 'Dos' })).toHaveFocus();
  });

  it('Escape y el clic en el fondo cierran', async () => {
    const onClose = renderModal();

    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
    await userEvent.click(screen.getByRole('dialog').parentElement!);
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('el clic dentro del diálogo no cierra', async () => {
    const onClose = renderModal();

    await userEvent.click(screen.getByRole('button', { name: 'Uno' }));
    await userEvent.click(screen.getByRole('heading', { name: 'Título' }));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('arrastrar desde dentro y soltar en el fondo no cierra', () => {
    const onClose = renderModal();
    const overlay = screen.getByRole('dialog').parentElement!;

    fireEvent.mouseDown(screen.getByRole('heading', { name: 'Título' }));
    fireEvent.click(overlay);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('con canClose a false ni Escape ni el fondo cierran', async () => {
    const onClose = renderModal({ canClose: false });

    await userEvent.keyboard('{Escape}');
    await userEvent.click(screen.getByRole('dialog').parentElement!);
    expect(onClose).not.toHaveBeenCalled();
  });
});
