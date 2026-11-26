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
    // Por defecto, una semana
    expect(rows()).toEqual(['Jornada 3sáb 19 dic→sáb 26 dic', 'Jornada 4sáb 26 dic→sáb 2 ene']);
    await userEvent.selectOptions(within(dialog).getByLabelText('Semanas'), 'Aplazar 2 semanas');

    expect(rows()).toEqual(['Jornada 3sáb 19 dic→sáb 2 ene', 'Jornada 4sáb 26 dic→sáb 9 ene']);
    await userEvent.click(within(dialog).getByRole('button', { name: 'Mover' }));
    expect(onConfirm).toHaveBeenCalledWith(2);
  });

  it('adelantar muestra fechas anteriores', async () => {
    renderModal();
    await userEvent.selectOptions(screen.getByLabelText('Semanas'), 'Adelantar 1 semana');

    expect(screen.getAllByRole('listitem')[0]).toHaveTextContent('Jornada 3sáb 19 dic→sáb 12 dic');
  });

  it('avisa de que se reabre el mercado en la jornada actual', () => {
    renderModal({ isCurrent: true });
    expect(screen.getByText(/Se reabrirá el mercado de esta jornada/)).toBeInTheDocument();
  });

  it('en una jornada futura no hay aviso de mercado', () => {
    renderModal();
    expect(screen.queryByText(/Se reabrirá el mercado/)).not.toBeInTheDocument();
  });

  it('pendiente: Mover deshabilitado y Escape no cierra', async () => {
    const { onClose } = renderModal({ pending: true });

    expect(screen.getByRole('button', { name: 'Mover' })).toBeDisabled();
    await userEvent.keyboard('{Escape}');
    expect(onClose).not.toHaveBeenCalled();
  });
});
