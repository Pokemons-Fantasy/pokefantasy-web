import { describe, it, expect } from 'vitest';
import { fireEvent, render } from '@testing-library/react';
import UserAvatar from './UserAvatar';
import { AvatarVersionsContext } from './AvatarVersionsContext';

describe('UserAvatar', () => {
  it('renders the initial and no image without a version', () => {
    const { container } = render(<UserAvatar username="ash" />);

    expect(container.querySelector('img')).toBeNull();
    const initial = container.querySelector('.member-avatar');
    expect(initial).toHaveAttribute('data-initial', 'a');
    expect(initial).toHaveAttribute('aria-hidden', 'true');
    expect(initial?.textContent).toBe('');
  });

  it('renders the versioned photo when given a version', () => {
    const { container } = render(<UserAvatar username="ash" avatarVersion={42} size={64} />);

    const img = container.querySelector('img');
    expect(img).toHaveAttribute('src', '/api/v1/users/ash/avatar?v=42');
    expect(img).toHaveAttribute('alt', '');
    expect(img).toHaveAttribute('width', '64');
  });

  it('takes the version from the league context', () => {
    const { container } = render(
      <AvatarVersionsContext.Provider value={new Map([['misty', 7]])}>
        <UserAvatar username="misty" />
      </AvatarVersionsContext.Provider>,
    );

    expect(container.querySelector('img')).toHaveAttribute('src', '/api/v1/users/misty/avatar?v=7');
  });

  it('an explicit null wins over the context', () => {
    const { container } = render(
      <AvatarVersionsContext.Provider value={new Map([['misty', 7]])}>
        <UserAvatar username="misty" avatarVersion={null} />
      </AvatarVersionsContext.Provider>,
    );

    expect(container.querySelector('img')).toBeNull();
  });

  it('falls back to the initial when the image fails', () => {
    const { container } = render(<UserAvatar username="ash" avatarVersion={42} />);

    fireEvent.error(container.querySelector('img')!);

    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('.member-avatar')).toHaveAttribute('data-initial', 'a');
  });

  it('tries again when the version changes after a failure', () => {
    const { container, rerender } = render(<UserAvatar username="ash" avatarVersion={1} />);
    fireEvent.error(container.querySelector('img')!);

    rerender(<UserAvatar username="ash" avatarVersion={2} />);

    expect(container.querySelector('img')).toHaveAttribute('src', '/api/v1/users/ash/avatar?v=2');
  });
});
