import { describe, it, expect, vi } from 'vitest';
import { useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useFocusTrap } from './useFocusTrap';

function Dialog({ name, children, initial = false }: { name: string; children?: ReactNode; initial?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const firstRef = useRef<HTMLButtonElement>(null);
  useFocusTrap(ref, { initialFocusRef: initial ? firstRef : undefined });
  return (
    <div ref={ref} role="dialog" aria-label={name} tabIndex={-1}>
      <button ref={firstRef} type="button">{name} uno</button>
      <button type="button" disabled>{name} deshabilitado</button>
      <input aria-label={`${name} campo`} />
      <button type="button">{name} dos</button>
      {children}
    </div>
  );
}

function EscDialog({ name, onEscape }: { name: string; onEscape?: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useFocusTrap(ref, { onEscape });
  return <div ref={ref} role="dialog" aria-label={name} tabIndex={-1}><button type="button">{name}</button></div>;
}

function EmptyDialog() {
  const ref = useRef<HTMLDivElement>(null);
  useFocusTrap(ref);
  return <div ref={ref} role="dialog" aria-label="Vacío" tabIndex={-1}>Sin botones</div>;
}

function Page({ dialog }: { dialog: (close: () => void) => ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>Abrir</button>
      <button type="button">Fondo</button>
      {open && dialog(() => setOpen(false))}
    </>
  );
}

describe('useFocusTrap', () => {
  it('empieza en el contenedor y Tab entra por el primero', async () => {
    render(<Dialog name="A" />);
    expect(screen.getByRole('dialog', { name: 'A' })).toHaveFocus();
    await userEvent.tab();
    expect(screen.getByRole('button', { name: 'A uno' })).toHaveFocus();
  });

  it('Shift+Tab desde el contenedor va al último', async () => {
    render(<Dialog name="A" />);
    await userEvent.tab({ shift: true });
    expect(screen.getByRole('button', { name: 'A dos' })).toHaveFocus();
  });

  it('Tab y Shift+Tab ciclan dentro, saltando los deshabilitados', async () => {
    render(<Dialog name="A" initial />);
    const first = screen.getByRole('button', { name: 'A uno' });
    const last = screen.getByRole('button', { name: 'A dos' });
    expect(first).toHaveFocus();

    await userEvent.tab();
    expect(screen.getByRole('textbox', { name: 'A campo' })).toHaveFocus();
    await userEvent.tab();
    expect(last).toHaveFocus();
    await userEvent.tab();
    expect(first).toHaveFocus();
    await userEvent.tab({ shift: true });
    expect(last).toHaveFocus();
  });

  it('sin nada enfocable el foco se queda en el contenedor', async () => {
    render(<EmptyDialog />);
    await userEvent.tab();
    expect(screen.getByRole('dialog', { name: 'Vacío' })).toHaveFocus();
  });

  it('al cerrar devuelve el foco a quien lo abrió', async () => {
    render(<Page dialog={(close) => <Dialog name="A"><button type="button" onClick={close}>Cerrar</button></Dialog>} />);
    const opener = screen.getByRole('button', { name: 'Abrir' });
    await userEvent.click(opener);
    expect(screen.getByRole('dialog', { name: 'A' })).toHaveFocus();

    await userEvent.click(screen.getByRole('button', { name: 'Cerrar' }));
    expect(opener).toHaveFocus();
  });

  it('Escape llama a onEscape solo en el modal de arriba', async () => {
    const outer = vi.fn();
    const inner = vi.fn();
    const { rerender } = render(<><EscDialog name="A" onEscape={outer} /><EscDialog name="B" onEscape={inner} /></>);

    await userEvent.keyboard('{Escape}');
    expect(inner).toHaveBeenCalledTimes(1);
    expect(outer).not.toHaveBeenCalled();

    rerender(<EscDialog name="A" onEscape={outer} />);
    await userEvent.keyboard('{Escape}');
    expect(outer).toHaveBeenCalledTimes(1);
  });

  it('sin onEscape, Escape no hace nada', async () => {
    render(<EscDialog name="A" />);
    await userEvent.keyboard('{Escape}');
    expect(screen.getByRole('dialog', { name: 'A' })).toBeInTheDocument();
  });

  it('con un modal encima solo cicla el de arriba', async () => {
    render(<Page dialog={() => <><Dialog name="A" /><Dialog name="B" initial /></>} />);
    await userEvent.click(screen.getByRole('button', { name: 'Abrir' }));
    const bFirst = screen.getByRole('button', { name: 'B uno' });
    expect(bFirst).toHaveFocus();

    await userEvent.tab({ shift: true });
    expect(screen.getByRole('button', { name: 'B dos' })).toHaveFocus();
    await userEvent.tab();
    expect(bFirst).toHaveFocus();
  });
});
