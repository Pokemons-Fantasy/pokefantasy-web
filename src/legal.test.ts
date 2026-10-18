import { describe, it, expect } from 'vitest';
import { LEGAL_CONTROLLER, LEGAL_CONTACT_EMAIL } from './legal';

describe('legal', () => {
  it('has a controller and a contact email (RGPD art. 13, LSSI art. 10)', () => {
    expect(LEGAL_CONTROLLER.trim()).not.toBe('');
    expect(LEGAL_CONTACT_EMAIL).toMatch(/^[^@\s]+@[^@\s]+\.[^@\s]+$/);
  });
});
