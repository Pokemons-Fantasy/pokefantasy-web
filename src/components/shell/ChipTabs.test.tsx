import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import ChipTabs from './ChipTabs';

const OPTIONS = [
  { value: 1, label: 'J1', ariaLabel: 'Jornada 1, jugada' },
  { value: 2, label: 'J2', ariaLabel: 'Jornada 2, actual' },
  { value: 3, label: 'J3', ariaLabel: 'Jornada 3' },
];

function Controlled({ onChange = vi.fn(), initial = 1 }) {
  const [value, setValue] = useState(initial);
  return (
    <ChipTabs
      label="Jornadas"
      idPrefix="jornadas"
      options={OPTIONS}
      value={value}
      onChange={(v) => { setValue(v); onChange(v); }}
    />
  );
}

describe('ChipTabs', () => {
  it('es una lista de pestañas con nombres accesibles y la actual seleccionada', () => {
    render(<Controlled initial={2} />);
    expect(screen.getByRole('tablist', { name: 'Jornadas' })).toBeInTheDocument();
    const tabs = screen.getAllByRole('tab');
    expect(tabs.map((t) => t.getAttribute('aria-label'))).toEqual(['Jornada 1, jugada', 'Jornada 2, actual', 'Jornada 3']);
    expect(tabs.map((t) => t.textContent)).toEqual(['J1', 'J2', 'J3']);
    expect(tabs[1]).toHaveAttribute('aria-selected', 'true');
    expect(tabs[1]).toHaveAttribute('tabindex', '0');
    expect(tabs[0]).toHaveAttribute('tabindex', '-1');
    expect(tabs[1]).toHaveAttribute('id', 'jornadas-tab-2');
    expect(tabs[1]).toHaveAttribute('aria-controls', 'jornadas-panel');
  });

  it('el clic cambia de jornada', async () => {
    const onChange = vi.fn();
    render(<Controlled onChange={onChange} />);
    await userEvent.click(screen.getByRole('tab', { name: 'Jornada 3' }));
    expect(onChange).toHaveBeenCalledWith(3);
  });

  it('las flechas dan la vuelta e Inicio va a la primera', async () => {
    const onChange = vi.fn();
    render(<Controlled onChange={onChange} />);
    screen.getByRole('tab', { name: 'Jornada 1, jugada' }).focus();
    await userEvent.keyboard('{ArrowLeft}');
    expect(onChange).toHaveBeenLastCalledWith(3);
    expect(screen.getByRole('tab', { name: 'Jornada 3' })).toHaveFocus();
    await userEvent.keyboard('{Home}');
    expect(onChange).toHaveBeenLastCalledWith(1);
  });
});
