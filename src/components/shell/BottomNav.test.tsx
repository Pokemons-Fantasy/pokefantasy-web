import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { Trophy, Users } from 'lucide-react';
import BottomNav from './BottomNav';
import type { BottomNavItem } from './BottomNav';

const items: BottomNavItem[] = [
  { path: 'teams', label: 'Equipos', icon: Users, badge: 3, badgeLabel: '3 intercambios pendientes' },
  { path: 'standings', label: 'Clasificación', icon: Trophy, badge: 0 },
];

function renderNav(props: Partial<Parameters<typeof BottomNav>[0]> = {}) {
  const onMore = vi.fn();
  render(
    <MemoryRouter initialEntries={['/leagues/L1/teams']}>
      <BottomNav items={items} active="teams" onMore={onMore} moreActive={false} {...props} />
    </MemoryRouter>,
  );
  return onMore;
}

describe('BottomNav', () => {
  it('pinta un enlace por sección y el botón Más', () => {
    renderNav();
    const nav = screen.getByRole('navigation', { name: 'Secciones de la liga' });
    expect(within(nav).getByRole('link', { name: /Equipos/ })).toHaveAttribute('href', '/teams');
    expect(within(nav).getByRole('link', { name: 'Clasificación' })).toBeInTheDocument();
    expect(within(nav).getByRole('button', { name: 'Más' })).toHaveAttribute('aria-haspopup', 'dialog');
  });

  it('marca la sección actual', () => {
    renderNav();
    expect(screen.getByRole('link', { name: /Equipos/ })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Clasificación' })).not.toHaveAttribute('aria-current');
    expect(screen.getByRole('button', { name: 'Más' })).not.toHaveAttribute('aria-current');
  });

  it('marca Más cuando la sección está dentro de Más', () => {
    renderNav({ active: 'config', moreActive: true });
    expect(screen.getByRole('button', { name: 'Más' })).toHaveAttribute('aria-current', 'page');
  });

  it('el badge se anuncia y no aparece a cero', () => {
    renderNav();
    expect(screen.getByRole('link', { name: 'Equipos, 3 intercambios pendientes' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Clasificación' })).toBeInTheDocument();
  });

  it('pulsar Más avisa al shell', async () => {
    const onMore = renderNav();
    await userEvent.click(screen.getByRole('button', { name: 'Más' }));
    expect(onMore).toHaveBeenCalledTimes(1);
  });
});
