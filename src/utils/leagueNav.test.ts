import { describe, it, expect } from 'vitest';
import { leagueTabs, leagueMenu, firstTab, activeSection, mobileNav } from './leagueNav';

const labels = (items: { label: string }[]) => items.map((i) => i.label);

describe('leagueTabs', () => {
  it('en preparación: Miembros, Pool, Draft', () => {
    expect(labels(leagueTabs('setup'))).toEqual(['Miembros', 'Pool', 'Draft']);
  });

  it('con el draft cancelado se comporta como en preparación', () => {
    expect(leagueTabs('cancelled')).toEqual(leagueTabs('setup'));
  });

  it('con el draft en curso, el draft va primero', () => {
    expect(labels(leagueTabs('draft'))).toEqual(['Draft', 'Pool', 'Miembros']);
  });

  it('en temporada: Equipos, Calendario, Clasificación, Actividad, Draft', () => {
    expect(leagueTabs('season').map((t) => t.path))
      .toEqual(['teams', 'schedule', 'standings', 'activity', 'draft']);
  });
});

describe('leagueMenu', () => {
  it('fuera de temporada solo Configuración, también para admin', () => {
    expect(labels(leagueMenu('setup', true))).toEqual(['Configuración']);
    expect(labels(leagueMenu('draft', true))).toEqual(['Configuración']);
  });

  it('en temporada el admin ve Gestionar tiers y Miembros', () => {
    expect(labels(leagueMenu('season', true))).toEqual(['Configuración', 'Gestionar tiers', 'Miembros']);
  });

  it('en temporada un jugador no ve Gestionar tiers', () => {
    expect(labels(leagueMenu('season', false))).toEqual(['Configuración', 'Miembros']);
  });
});

describe('firstTab', () => {
  it('es la primera pestaña de la fase', () => {
    expect(firstTab('setup')).toBe('members');
    expect(firstTab('draft')).toBe('draft');
    expect(firstTab('season')).toBe('teams');
  });
});

describe('activeSection', () => {
  it('usa el primer segmento de la subruta', () => {
    expect(activeSection('schedule')).toBe('schedule');
    expect(activeSection('')).toBe('');
  });

  it('el perfil de un jugador cuelga de Clasificación', () => {
    expect(activeSection('players/ash')).toBe('standings');
  });
});

describe('fase de preparación del draft', () => {
  it('el draft va primero', () => {
    expect(leagueTabs('preparing').map((t) => t.path)).toEqual(['draft', 'pool', 'members']);
    expect(firstTab('preparing')).toBe('draft');
  });
});

describe('mobileNav', () => {
  const paths = (items: { path: string }[]) => items.map((i) => i.path);

  it('en temporada (admin): cuatro pestañas y en Más el draft y el menú de admin', () => {
    const nav = mobileNav('season', true);
    expect(paths(nav.bar)).toEqual(['teams', 'schedule', 'standings', 'activity']);
    expect(paths(nav.more)).toEqual(['draft', 'config', 'tiers', 'members']);
  });

  it('en temporada (jugador): sin Gestionar tiers', () => {
    expect(paths(mobileNav('season', false).more)).toEqual(['draft', 'config', 'members']);
  });

  it.each(['draft', 'preparing'] as const)('con el draft %s: las pestañas de la fase y Configuración en Más', (phase) => {
    const nav = mobileNav(phase, true);
    expect(paths(nav.bar)).toEqual(['draft', 'pool', 'members']);
    expect(paths(nav.more)).toEqual(['config']);
  });

  it.each(['setup', 'cancelled'] as const)('en %s: Miembros, Pool, Draft', (phase) => {
    const nav = mobileNav(phase, false);
    expect(paths(nav.bar)).toEqual(['members', 'pool', 'draft']);
    expect(paths(nav.more)).toEqual(['config']);
  });
});
