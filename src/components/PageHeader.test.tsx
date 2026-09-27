import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PageHeader from './PageHeader';
import { useAuthStore } from '../store/authStore';

describe('PageHeader', () => {
  beforeEach(() => {
    useAuthStore.setState({ username: 'ash' });
  });

  it('el logo y el saludo son enlaces a la home y al perfil', () => {
    render(<MemoryRouter><PageHeader /></MemoryRouter>);
    expect(screen.getByRole('link', { name: 'PokeFantasy' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: /Hola, ash/ })).toHaveAttribute('href', '/profile');
  });
});
