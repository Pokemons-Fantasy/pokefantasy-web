import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Notice from './Notice';

describe('Notice', () => {
  it('renders children with the variant class', () => {
    render(<Notice variant="warning">Robos cerrados</Notice>);
    const notice = screen.getByRole('status');
    expect(notice).toHaveTextContent('Robos cerrados');
    expect(notice).toHaveClass('notice', 'notice-warning');
  });

  it('defaults to info', () => {
    render(<Notice>Solo lectura</Notice>);
    expect(screen.getByRole('status')).toHaveClass('notice-info');
  });

  it('uses role alert for danger', () => {
    render(<Notice variant="danger">Error</Notice>);
    expect(screen.getByRole('alert')).toHaveClass('notice-danger');
  });
});
