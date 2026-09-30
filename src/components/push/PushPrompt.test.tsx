import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PushPrompt from './PushPrompt';
import { useAuthStore } from '../../store/authStore';
import { useToastStore } from '../../store/toastStore';
import type { WebPushEnv } from '../../utils/webPush';

let env: WebPushEnv;
vi.mock('../../push/env', () => ({ readWebPushEnv: () => env }));
vi.mock('../../push/webPush', () => ({
  enableWebPush: vi.fn(async () => 'enabled'),
  disableWebPush: vi.fn(async () => {}),
  dismissWebPushPrompt: vi.fn((user: string) => localStorage.setItem(`pf:web-push-dismissed:${user}`, '1')),
  isWebPushPromptDismissed: (user: string) => localStorage.getItem(`pf:web-push-dismissed:${user}`) === '1',
}));
import * as webPush from '../../push/webPush';

const base: WebPushEnv = { native: false, configured: true, supported: true, ios: false, standalone: false, permission: 'default', enabled: false };

describe('PushPrompt', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    env = { ...base };
    useAuthStore.setState({ username: 'ash' });
    useToastStore.setState({ toasts: [] });
  });

  it('ofrece activarlas y "Activar" las activa para ese usuario', async () => {
    render(<PushPrompt context="draft" />);
    expect(screen.getByRole('status')).toHaveTextContent('enterarte de tu turno aunque cierres la página');

    await userEvent.click(screen.getByRole('button', { name: 'Activar' }));

    expect(webPush.enableWebPush).toHaveBeenCalledWith('ash');
    expect(useToastStore.getState().toasts.map((t) => t.message)).toContain('Notificaciones activadas');
  });

  it('"Ahora no" lo oculta y se recuerda', async () => {
    const { unmount } = render(<PushPrompt context="home" />);
    await userEvent.click(screen.getByRole('button', { name: 'Ahora no' }));
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    unmount();

    render(<PushPrompt context="home" />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('si cierra el diálogo del navegador sin elegir, el aviso sigue ahí', async () => {
    vi.mocked(webPush.enableWebPush).mockResolvedValueOnce('off');
    render(<PushPrompt context="draft" />);
    await userEvent.click(screen.getByRole('button', { name: 'Activar' }));
    expect(await screen.findByRole('button', { name: 'Activar' })).toBeEnabled();
  });

  it('en iPhone sin instalar explica cómo añadirla a la pantalla de inicio', () => {
    env = { ...base, ios: true, standalone: false, supported: false };
    render(<PushPrompt context="draft" />);
    expect(screen.getByRole('status')).toHaveTextContent('Añadir a pantalla de inicio');
    expect(screen.queryByRole('button', { name: 'Activar' })).not.toBeInTheDocument();
  });

  it('activadas, bloqueadas, sin Firebase o en la app: no sale', () => {
    for (const patch of [
      { permission: 'granted' as const, enabled: true },
      { permission: 'denied' as const },
      { configured: false },
      { native: true },
    ]) {
      env = { ...base, ...patch };
      const { unmount } = render(<PushPrompt context="draft" />);
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
      unmount();
    }
  });
});
