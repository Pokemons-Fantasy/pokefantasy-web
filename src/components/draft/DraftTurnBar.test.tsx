import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DraftTurnBar from './DraftTurnBar';

const base = { currentTurn: 'ash', isMyTurn: true, iAmOut: false, round: 2, secondsLeft: 23, remaining: 300 };

describe('DraftTurnBar', () => {
  it('cuando te toca lo dice, con la ronda, el reloj y tus monedas', () => {
    render(<DraftTurnBar {...base} />);
    const bar = screen.getByRole('status');
    expect(bar).toHaveTextContent('Te toca');
    expect(bar).toHaveTextContent('Ronda 2');
    expect(bar).toHaveTextContent('23s');
    expect(bar).toHaveTextContent('Te quedan 300');
    expect(bar).toHaveAttribute('data-mine', 'true');
  });

  it('cuando es de otro, dice de quién', () => {
    render(<DraftTurnBar {...base} currentTurn="misty" isMyTurn={false} />);
    const bar = screen.getByRole('status');
    expect(bar).toHaveTextContent('Turno de misty');
    expect(bar).not.toHaveAttribute('data-mine');
  });

  it('con onChoose ofrece volver a elegir', async () => {
    const onChoose = vi.fn();
    render(<DraftTurnBar {...base} onChoose={onChoose} />);
    await userEvent.click(screen.getByRole('button', { name: 'Elegir' }));
    expect(onChoose).toHaveBeenCalledTimes(1);
  });

  it('sin onChoose no hay botón', () => {
    render(<DraftTurnBar {...base} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('si tu draft ha terminado lo dice', () => {
    render(<DraftTurnBar {...base} currentTurn="misty" isMyTurn={false} iAmOut />);
    expect(screen.getByRole('status')).toHaveTextContent('Tu draft ha terminado');
  });

  it('si no juegas no habla de tus monedas', () => {
    render(<DraftTurnBar {...base} currentTurn="misty" isMyTurn={false} remaining={null} />);
    expect(screen.getByRole('status')).not.toHaveTextContent('Te quedan');
  });
});
