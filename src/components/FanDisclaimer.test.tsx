import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import FanDisclaimer from './FanDisclaimer';

describe('FanDisclaimer', () => {
  it('says it is a non-profit fan project not affiliated with the rights holders and links to /about', () => {
    render(<MemoryRouter><FanDisclaimer /></MemoryRouter>);

    const text = screen.getByRole('note').textContent ?? '';
    expect(text).toContain('Proyecto fan sin ánimo de lucro');
    expect(text).toContain('no afiliado a Nintendo, Game Freak, Creatures ni The Pokémon Company');
    expect(screen.getByRole('link', { name: 'Acerca de' })).toHaveAttribute('href', '/about');
  });
});
