import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TierBadge from './TierBadge';

describe('TierBadge', () => {
  it('renders nothing when tier is null/undefined', () => {
    const { container } = render(<TierBadge tier={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders the tier letter with the matching CSS class', () => {
    render(<TierBadge tier="S" />);
    const badge = screen.getByText('S');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('tier-badge-s');
  });

  it('calls onClick when clicked and shows a tooltip', async () => {
    const onClick = vi.fn();
    render(<TierBadge tier="A" onClick={onClick} />);
    const badge = screen.getByText('A');
    expect(badge).toHaveAttribute('title', 'Ajustar tier');

    await userEvent.click(badge);
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
