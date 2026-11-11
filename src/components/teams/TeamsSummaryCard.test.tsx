import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import TeamsSummaryCard from './TeamsSummaryCard';
import type { TeamsSummary } from '../../utils/teamsSummary';

const SUMMARY: TeamsSummary = {
  roundNumber: 2,
  headline: 'Tu partido: vs jessie',
  opponent: 'jessie',
  nextLine: null,
  last: 'Ganaste a may 6–0',
  steal: { open: true, text: 'abiertos · cierran en 5 h' },
  swap: { open: false, text: 'cerrados · abren al completarse la jornada 2' },
};

function renderCard(props: Partial<Parameters<typeof TeamsSummaryCard>[0]> = {}) {
  const onOpenTrades = vi.fn();
  render(
    <MemoryRouter>
      <TeamsSummaryCard summary={SUMMARY} coins={120} pendingTrades={0} onOpenTrades={onOpenTrades} {...props} />
    </MemoryRouter>,
  );
  return onOpenTrades;
}

describe('TeamsSummaryCard', () => {
  it('cuenta la jornada, tu partido y tu último resultado', () => {
    renderCard();
    expect(screen.getByText('Jornada 2')).toBeInTheDocument();
    expect(screen.getByText('Último: Ganaste a may 6–0')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Tu partido: vs jessie' })).toHaveAttribute('href', '/schedule');
  });

  it('sin partido en la jornada, el titular no es un enlace y muestra el próximo', () => {
    renderCard({ summary: { ...SUMMARY, headline: 'Descansas esta jornada', opponent: null, nextLine: 'Próximo: misty (jornada 3)' } });
    expect(screen.getByText('Descansas esta jornada')).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.getByText('Próximo: misty (jornada 3)')).toBeInTheDocument();
  });

  it('con la temporada terminada no dice jornada', () => {
    renderCard({ summary: { ...SUMMARY, roundNumber: null, headline: 'Temporada terminada', opponent: null } });
    expect(screen.queryByText(/Jornada/)).not.toBeInTheDocument();
    expect(screen.getByText('Temporada terminada')).toBeInTheDocument();
  });

  it('muestra el estado de robos e intercambios', () => {
    renderCard();
    const status = screen.getByRole('status', { name: 'Estado del mercado' });
    expect(status).toHaveTextContent('Robosabiertos · cierran en 5 h');
    expect(status).toHaveTextContent('Intercambios y banquillocerrados · abren al completarse la jornada 2');
    expect(status.querySelector('.market-chip.open')).toHaveTextContent('Robos');
    expect(status.querySelector('.market-chip.closed')).toHaveTextContent('Intercambios y banquillo');
  });

  it('el botón Intercambios avisa de los pendientes y los abre', async () => {
    const onOpenTrades = renderCard({ pendingTrades: 2 });
    await userEvent.click(screen.getByRole('button', { name: 'Intercambios, 2 pendientes' }));
    expect(onOpenTrades).toHaveBeenCalledTimes(1);
  });

  it('sin pendientes el botón no lleva número', () => {
    renderCard();
    expect(screen.getByRole('button', { name: 'Intercambios' })).toBeInTheDocument();
  });

  it('muestra tus monedas si se conocen', () => {
    renderCard();
    expect(screen.getByText(/120/)).toBeInTheDocument();
  });
});
