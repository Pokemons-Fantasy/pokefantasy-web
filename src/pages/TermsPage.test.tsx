import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import TermsPage from './TermsPage';

describe('TermsPage', () => {
  it('lists the rules, what the admin can do and how to report', () => {
    render(<MemoryRouter><TermsPage /></MemoryRouter>);

    expect(screen.getByRole('heading', { level: 1, name: 'Normas de uso' })).toBeInTheDocument();
    const text = document.body.textContent ?? '';
    expect(text).toContain('Sé respetuoso');
    expect(text).toContain('Una cuenta por persona');
    expect(text).toContain('borrar cuentas');
    expect(screen.getByRole('link', { name: 'villuprise@gmail.com' })).toHaveAttribute('href', 'mailto:villuprise@gmail.com');
    expect(screen.getByRole('link', { name: 'Volver' })).toHaveAttribute('href', '/');
  });
});
