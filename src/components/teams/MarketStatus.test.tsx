import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import MarketStatus from './MarketStatus';
import type { ScheduleResponse } from '../../api/leagues';

const SCHEDULE: ScheduleResponse = {
  leagueId: 'l1',
  stealWindowOpen: true,
  swapWindowOpen: false,
  jornadas: [
    { roundNumber: 1, matches: [{ id: 'm1', player1: 'ash', player2: 'brock', status: 'COMPLETED' }] },
    {
      roundNumber: 2,
      matches: [{ id: 'm2', player1: 'ash', player2: 'misty', status: 'PENDING' }],
      startDate: '2026-06-01',
      stealDeadline: '2026-06-04T23:59:00',
      swapDeadline: '2026-06-05T16:00:00',
    },
  ],
};

describe('MarketStatus', () => {
  afterEach(() => { vi.useRealTimers(); });

  it('muestra una línea por ventana con su estado', () => {
    vi.useFakeTimers({ now: new Date('2026-06-02T10:00:00') });
    render(<MarketStatus schedule={SCHEDULE} />);

    const steal = screen.getByText('Robos').closest('.market-chip');
    expect(steal).toHaveClass('open');
    expect(steal).toHaveTextContent('abiertos · cierran jue 23:59');

    const swap = screen.getByText('Intercambios y banquillo').closest('.market-chip');
    expect(swap).toHaveClass('closed');
    expect(swap).toHaveTextContent('cerrados · abren al completarse la jornada 2');
  });

  it('actualiza la cuenta atrás con el paso del tiempo', () => {
    vi.useFakeTimers({ now: new Date('2026-06-04T18:30:00') });
    render(<MarketStatus schedule={SCHEDULE} />);
    expect(screen.getByText(/cierran en 5 h/)).toBeInTheDocument();

    act(() => { vi.advanceTimersByTime(2 * 60 * 60 * 1000); });
    expect(screen.getByText(/cierran en 3 h/)).toBeInTheDocument();
  });
});
