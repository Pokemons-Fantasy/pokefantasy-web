import { describe, it, expect, vi } from 'vitest';
import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ConfirmDialog from './ConfirmDialog';

function Page({ onConfirm = vi.fn() }: { onConfirm?: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>Borrar</button>
      <button type="button">Otra cosa</button>
      {open && (
        <ConfirmDialog
          title="¿Borrar?"
          message="No se puede deshacer."
          confirmLabel="Sí, borrar"
          pendingLabel="Borrando…"
          pending={false}
          danger
          onConfirm={onConfirm}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

describe('ConfirmDialog', () => {
  it('empieza en Cancelar y Tab / Shift+Tab no salen del diálogo', async () => {
    render(<Page />);
    await userEvent.click(screen.getByRole('button', { name: 'Borrar' }));
    const cancel = screen.getByRole('button', { name: 'Cancelar' });
    const confirm = screen.getByRole('button', { name: 'Sí, borrar' });
    expect(cancel).toHaveFocus();

    await userEvent.tab();
    expect(confirm).toHaveFocus();
    await userEvent.tab();
    expect(cancel).toHaveFocus();
    await userEvent.tab({ shift: true });
    expect(confirm).toHaveFocus();
  });

  it('Escape cierra y devuelve el foco al botón que lo abrió', async () => {
    render(<Page />);
    const opener = screen.getByRole('button', { name: 'Borrar' });
    await userEvent.click(opener);
    await userEvent.keyboard('{Escape}');

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
  });
});
