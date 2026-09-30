import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PushToggle from './PushToggle';
import { useAuthStore } from '../../store/authStore';
import type { WebPushEnv } from '../../utils/webPush';

let env: WebPushEnv;
vi.mock('../../push/env', () => ({ readWebPushEnv: () => env }));
vi.mock('../../push/webPush', () => ({
  enableWebPush: vi.fn(async () => 'enabled'),
  disableWebPush: vi.fn(async () => {}),
  dismissWebPushPrompt: vi.fn(),
  isWebPushPromptDismissed: () => false,
}));
import * as webPush from '../../push/webPush';

const base: WebPushEnv = { native: false, configured: true, supported: true, ios: false, standalone: false, permission: 'granted', enabled: true };

describe('PushToggle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    env = { ...base };
    useAuthStore.setState({ username: 'ash' });
  });

  it('activadas: el interruptor está encendido y apagarlo las desactiva', async () => {
    render(<PushToggle />);
    const toggle = screen.getByRole('switch', { name: 'Notificaciones en este dispositivo' });
    expect(toggle).toHaveAttribute('aria-checked', 'true');
    await userEvent.click(toggle);
    expect(webPush.disableWebPush).toHaveBeenCalledWith('ash');
  });

  it('apagadas: encenderlo las activa', async () => {
    env = { ...base, enabled: false, permission: 'default' };
    render(<PushToggle />);
    await userEvent.click(screen.getByRole('switch', { name: 'Notificaciones en este dispositivo' }));
    expect(webPush.enableWebPush).toHaveBeenCalledWith('ash');
  });

  it('bloqueadas: explica cómo desbloquearlas y no ofrece el interruptor', () => {
    env = { ...base, permission: 'denied', enabled: false };
    render(<PushToggle />);
    expect(screen.queryByRole('switch')).not.toBeInTheDocument();
    expect(screen.getByText(/bloqueado en el navegador/)).toBeInTheDocument();
  });

  it('navegador sin push o iPhone sin instalar: lo dice', () => {
    env = { ...base, supported: false, enabled: false };
    const { unmount } = render(<PushToggle />);
    expect(screen.getByText('Este navegador no admite notificaciones.')).toBeInTheDocument();
    unmount();
    env = { ...base, ios: true, standalone: false, enabled: false };
    render(<PushToggle />);
    expect(screen.getByText(/pantalla de inicio/)).toBeInTheDocument();
  });

  it('en la app o sin Firebase no se pinta nada', () => {
    env = { ...base, native: true };
    const { container } = render(<PushToggle />);
    expect(container).toBeEmptyDOMElement();
  });
});
