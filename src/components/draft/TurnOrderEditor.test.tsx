import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TurnOrderEditor from './TurnOrderEditor';

describe('TurnOrderEditor', () => {
  it('sube, baja y baraja sin perder a nadie', async () => {
    const onChange = vi.fn();
    render(<TurnOrderEditor order={['ash', 'misty', 'brock']} onChange={onChange} />);

    await userEvent.click(screen.getByRole('button', { name: 'Subir a misty' }));
    expect(onChange).toHaveBeenLastCalledWith(['misty', 'ash', 'brock']);

    await userEvent.click(screen.getByRole('button', { name: 'Bajar a misty' }));
    expect(onChange).toHaveBeenLastCalledWith(['ash', 'brock', 'misty']);

    const random = vi.spyOn(Math, 'random').mockReturnValue(0);
    await userEvent.click(screen.getByRole('button', { name: 'Barajar' }));
    expect(onChange).toHaveBeenLastCalledWith(['misty', 'brock', 'ash']);
    random.mockRestore();
  });

  it('deshabilitado no deja mover', () => {
    render(<TurnOrderEditor order={['ash', 'misty']} onChange={() => {}} disabled />);
    expect(screen.getByRole('button', { name: 'Barajar' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Bajar a ash' })).toBeDisabled();
  });
});
