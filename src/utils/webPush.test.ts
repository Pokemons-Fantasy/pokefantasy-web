import { describe, it, expect } from 'vitest';
import { isOtherAccountPushKey, pushDismissedKey, pushTokenKey, shouldPrompt, webPushStatus, type WebPushEnv } from './webPush';

const env = (patch: Partial<WebPushEnv> = {}): WebPushEnv => ({
  native: false, configured: true, supported: true, ios: false, standalone: false,
  permission: 'default', enabled: false, ...patch,
});

describe('webPushStatus', () => {
  it('en la app nativa o sin Firebase configurado no se ofrece nada', () => {
    expect(webPushStatus(env({ native: true }))).toBe('hidden');
    expect(webPushStatus(env({ configured: false }))).toBe('hidden');
  });

  it('iPhone en Safari sin instalar: hay que añadirla a la pantalla de inicio', () => {
    expect(webPushStatus(env({ ios: true, standalone: false, supported: false }))).toBe('needs-install');
    expect(webPushStatus(env({ ios: true, standalone: true }))).toBe('off');
  });

  it('navegador sin push, bloqueadas, activadas y sin decidir', () => {
    expect(webPushStatus(env({ supported: false }))).toBe('unsupported');
    expect(webPushStatus(env({ permission: 'denied' }))).toBe('blocked');
    expect(webPushStatus(env({ permission: 'granted', enabled: true }))).toBe('enabled');
    expect(webPushStatus(env({ permission: 'granted', enabled: false }))).toBe('off');
    expect(webPushStatus(env({ permission: 'default', enabled: true }))).toBe('off');
  });
});

describe('shouldPrompt', () => {
  it('solo sin decidir o por instalar, y si no se ha dicho "Ahora no"', () => {
    expect(shouldPrompt('off', false)).toBe(true);
    expect(shouldPrompt('needs-install', false)).toBe(true);
    expect(shouldPrompt('off', true)).toBe(false);
    for (const status of ['hidden', 'unsupported', 'blocked', 'enabled'] as const) {
      expect(shouldPrompt(status, false)).toBe(false);
    }
  });
});

describe('claves por usuario', () => {
  it('cada cuenta tiene las suyas en el mismo navegador', () => {
    expect(pushTokenKey('ash')).toBe('pf:web-push:ash');
    expect(pushDismissedKey('ash')).toBe('pf:web-push-dismissed:ash');
    expect(pushTokenKey('ash')).not.toBe(pushTokenKey('brock'));
  });
});

describe('isOtherAccountPushKey', () => {
  it('reconoce los avisos activados de otra cuenta, no los propios ni los "Ahora no"', () => {
    expect(isOtherAccountPushKey('pf:web-push:ash', 'brock')).toBe(true);
    expect(isOtherAccountPushKey('pf:web-push:brock', 'brock')).toBe(false);
    expect(isOtherAccountPushKey('pf:web-push-dismissed:ash', 'brock')).toBe(false);
    expect(isOtherAccountPushKey('auth-storage', 'brock')).toBe(false);
  });
});
