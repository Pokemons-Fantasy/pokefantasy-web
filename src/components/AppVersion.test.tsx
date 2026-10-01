import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import AppVersion from './AppVersion';
import { version } from '../../package.json';

describe('AppVersion', () => {
  it('muestra la versión de la app en el flujo de la página, no flotando', () => {
    render(<AppVersion />);
    const label = screen.getByText(`v${version}`);
    expect(label).toHaveClass('app-version');
    expect(label).not.toHaveStyle({ position: 'fixed' });
  });
});
