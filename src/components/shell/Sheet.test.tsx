import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import Sheet from './Sheet';
import { handleBack } from '../../hooks/useBackButton';

function renderSheet({ canClose = true, onClose = vi.fn() } = {}) {
  render(
    <Sheet labelledBy="t" onClose={onClose} canClose={canClose}>
      <h2 id="t">Más</h2>
      <button type="button">Uno</button>
    </Sheet>,
  );
  return onClose;
}

describe('Sheet', () => {
  it('es un diálogo modal con nombre', () => {
    renderSheet();
    const dialog = screen.getByRole('dialog', { name: 'Más' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
  });

  it('el foco entra al abrir y vuelve al botón que lo abrió', async () => {
    function Opener() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button type="button" onClick={() => setOpen(true)}>Abrir</button>
          {open && (
            <Sheet labelledBy="t" onClose={() => setOpen(false)}>
              <h2 id="t">Más</h2>
              <button type="button">Uno</button>
            </Sheet>
          )}
        </>
      );
    }
    render(<Opener />);
    const opener = screen.getByRole('button', { name: 'Abrir' });
    await userEvent.click(opener);
    expect(screen.getByRole('dialog').contains(document.activeElement)).toBe(true);
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
  });

  it('Escape y el clic en el fondo cierran', async () => {
    const onClose = renderSheet();
    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
    const backdrop = screen.getByTestId('sheet-backdrop');
    fireEvent.mouseDown(backdrop);
    fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('con una acción en curso no se cierra con Escape, el fondo ni atrás', async () => {
    const onClose = renderSheet({ canClose: false });
    await userEvent.keyboard('{Escape}');
    const backdrop = screen.getByTestId('sheet-backdrop');
    fireEvent.mouseDown(backdrop);
    fireEvent.click(backdrop);
    handleBack(false, vi.fn(), vi.fn());
    expect(onClose).not.toHaveBeenCalled();
  });

  it('el botón atrás de Android lo cierra', () => {
    const onClose = renderSheet();
    handleBack(false, vi.fn(), vi.fn());
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('bloquea el scroll de la página mientras está abierto', () => {
    document.body.style.overflow = 'auto';
    const { unmount } = render(
      <Sheet labelledBy="t" onClose={vi.fn()}><h2 id="t">Más</h2></Sheet>,
    );
    expect(document.body.style.overflow).toBe('hidden');
    unmount();
    expect(document.body.style.overflow).toBe('auto');
  });
});
