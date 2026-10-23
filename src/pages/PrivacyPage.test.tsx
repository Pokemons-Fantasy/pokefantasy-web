import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PrivacyPage from './PrivacyPage';

describe('PrivacyPage', () => {
  it('names the controller, the contact, the processors, the minimum age and how to delete the account', () => {
    render(<MemoryRouter><PrivacyPage /></MemoryRouter>);

    expect(screen.getByRole('heading', { level: 1, name: 'Política de privacidad' })).toBeInTheDocument();
    const text = document.body.textContent ?? '';
    expect(text).toContain('Adrian Rafael Rego Rodriguez');
    expect(screen.getAllByRole('link', { name: 'villuprise@gmail.com' })[0]).toHaveAttribute('href', 'mailto:villuprise@gmail.com');
    for (const processor of ['Render', 'Netlify', 'MongoDB Atlas', 'Upstash', 'Firebase', 'Sentry', 'GitHub']) {
      expect(text).toContain(processor);
    }
    expect(text).toContain('14 años');
    expect(text).toContain('Usuario eliminado');
    expect(text).toContain('Borrar cuenta');
    expect(text).toContain('AEPD');
    expect(screen.getByRole('link', { name: 'Volver' })).toHaveAttribute('href', '/');
  });
});
