import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import ShiftScheduleModal from './ShiftScheduleModal';
import type { JornadaDto } from '../../api/leagues';

const JORNADAS: JornadaDto[] = ['2026-12-05', '2026-12-12', '2026-12-19', '2026-12-26']
  .map((startDate, i) => ({ roundNumber: i + 1, matches: [], startDate }));

function renderModal(props: { isCurrent?: boolean; pending?: boolean } = {}) {
  const onConfirm = vi.fn();
  const onClose = vi.fn();
  render(
    <MemoryRouter>
      <ShiftScheduleModal
        jornadas={JORNADAS}
        fromRound={3}
        isCurrent={props.isCurrent ?? false}
        pending={props.pending ?? false}
        onConfirm={onConfirm}
        onClose={onClose}
      />
    </MemoryRouter>
  );
  return { onConfirm, onClose };
}

describe('ShiftScheduleModal', () => {
  it('muestra la vista previa y confirma las semanas elegidas', async () => {
    const { onConfirm } = renderModal();
    const dialog = screen.getByRole('dialog', { name: 'Mover jornadas' });

    const rows = () => within(within(dialog).getByRole('list', { name: 'Fechas nuevas' }))
      .getAllByRole('listitem').map((li) => li.textContent);
    // Por defecto, una semana; si alguna fila cruza de año, todas llevan el año (mismo formato en la lista)
    expect(rows()).toEqual([
      'Jornada 3sáb 19 dic 2026 pasa a →sáb 26 dic 2026',
      'Jornada 4sáb 26 dic 2026 pasa a →sáb 2 ene 2027',
    ]);
    await userEvent.selectOptions(within(dialog).getByLabelText('Semanas'), 'Aplazar 2 semanas');

    expect(rows()).toEqual([
      'Jornada 3sáb 19 dic 2026 pasa a →sáb 2 ene 2027',
      'Jornada 4sáb 26 dic 2026 pasa a →sáb 9 ene 2027',
    ]);
    await userEvent.click(within(dialog).getByRole('button', { name: 'Mover' }));
    expect(onConfirm).toHaveBeenCalledWith(2);
  });

  it('adelantar muestra fechas anteriores', async () => {
    renderModal();
    await userEvent.selectOptions(screen.getByLabelText('Semanas'), 'Adelantar 1 semana');

    expect(screen.getAllByRole('listitem')[0]).toHaveTextContent('Jornada 3sáb 19 dic pasa a →sáb 12 dic');
  });

  it('avisa de que se reabre el mercado en la jornada actual, como descripción del diálogo', () => {
    renderModal({ isCurrent: true });
    expect(screen.getByRole('dialog', { name: 'Mover jornadas' }))
      .toHaveAccessibleDescription(/Se reabrirá el mercado de esta jornada/);
  });

  it('en una jornada futura no hay aviso de mercado', () => {
    renderModal();
    expect(screen.queryByText(/Se reabrirá el mercado/)).not.toBeInTheDocument();
  });

  it('pendiente: Mover no se puede pulsar pero conserva el foco, y Escape no cierra', async () => {
    const { onClose, onConfirm } = renderModal({ pending: true });

    const move = screen.getByRole('button', { name: 'Moviendo…' });
    expect(move).toHaveAttribute('aria-disabled', 'true');
    expect(move).toBeEnabled();
    expect(screen.getByLabelText('Semanas')).toBeDisabled();
    await userEvent.click(move);
    expect(onConfirm).not.toHaveBeenCalled();
    await userEvent.keyboard('{Escape}');
    expect(onClose).not.toHaveBeenCalled();
  });
});
