import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import SegmentedTabs from './SegmentedTabs';

type View = 'equipo' | 'rivales' | 'banquillo';
const OPTIONS: { value: View; label: string }[] = [
  { value: 'equipo', label: 'Mi equipo' },
  { value: 'rivales', label: 'Rivales' },
  { value: 'banquillo', label: 'Banquillo' },
];

function Controlled({ onChange = vi.fn(), initial = 'equipo' as View }) {
  const [value, setValue] = useState<View>(initial);
  return (
    <SegmentedTabs
      label="Secciones de Equipos"
      idPrefix="equipos"
      options={OPTIONS}
      value={value}
      onChange={(v) => { setValue(v); onChange(v); }}
    />
  );
}

describe('SegmentedTabs', () => {
  it('es una lista de pestañas con la actual seleccionada', () => {
    render(<Controlled />);
    expect(screen.getByRole('tablist', { name: 'Secciones de Equipos' })).toBeInTheDocument();
    const tabs = screen.getAllByRole('tab');
    expect(tabs.map((t) => t.textContent)).toEqual(['Mi equipo', 'Rivales', 'Banquillo']);
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
    expect(tabs[0]).toHaveAttribute('tabindex', '0');
    expect(tabs[1]).toHaveAttribute('aria-selected', 'false');
    expect(tabs[1]).toHaveAttribute('tabindex', '-1');
    expect(tabs[0]).toHaveAttribute('aria-controls', 'equipos-panel');
    expect(tabs[0]).toHaveAttribute('id', 'equipos-tab-equipo');
  });

  it('el clic cambia de pestaña', async () => {
    const onChange = vi.fn();
    render(<Controlled onChange={onChange} />);
    await userEvent.click(screen.getByRole('tab', { name: 'Banquillo' }));
    expect(onChange).toHaveBeenCalledWith('banquillo');
  });

  it('las flechas, Inicio y Fin recorren las pestañas con vuelta y mueven el foco', async () => {
    const onChange = vi.fn();
    render(<Controlled onChange={onChange} />);
    screen.getByRole('tab', { name: 'Mi equipo' }).focus();

    await userEvent.keyboard('{ArrowLeft}');
    expect(onChange).toHaveBeenLastCalledWith('banquillo');
    expect(screen.getByRole('tab', { name: 'Banquillo' })).toHaveFocus();

    await userEvent.keyboard('{ArrowRight}');
    expect(onChange).toHaveBeenLastCalledWith('equipo');

    await userEvent.keyboard('{End}');
    expect(onChange).toHaveBeenLastCalledWith('banquillo');

    await userEvent.keyboard('{Home}');
    expect(onChange).toHaveBeenLastCalledWith('equipo');
    expect(screen.getByRole('tab', { name: 'Mi equipo' })).toHaveFocus();
  });
});
