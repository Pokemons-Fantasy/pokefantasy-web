import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AboutPage from './AboutPage';

describe('AboutPage', () => {
  it('explains the fan project, the trademarks and that sprites come from PokeAPI', () => {
    render(<MemoryRouter><AboutPage /></MemoryRouter>);

    expect(screen.getByRole('heading', { level: 1, name: 'Acerca de PokeFantasy' })).toBeInTheDocument();
    const text = document.body.textContent ?? '';
    expect(text).toContain('no afiliado a Nintendo, Game Freak, Creatures ni The Pokémon Company');
    expect(text).toContain('Pokémon y los nombres de los Pokémon son marcas de sus respectivos titulares');
    expect(text).toContain('PokeAPI');
    expect(screen.getByRole('link', { name: 'villuprise@gmail.com' })).toHaveAttribute('href', 'mailto:villuprise@gmail.com');
    expect(text).toContain('Adrian Rafael Rego Rodriguez');
    expect(screen.getByRole('link', { name: 'Volver' })).toHaveAttribute('href', '/');
  });
});
