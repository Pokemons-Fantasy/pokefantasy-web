import { describe, it, expect } from 'vitest';
import { extractErrorMessage } from './errorMessage';

describe('extractErrorMessage', () => {
  it('reads `message` from a ProblemDetail (current backend format)', () => {
    const err = { response: { data: {
      type: 'about:blank', title: 'Conflict', status: 409, detail: 'La ventana de robos no está abierta.',
      code: 'CONFLICT', message: 'La ventana de robos no está abierta.', requestId: 'abc',
    } } };
    expect(extractErrorMessage(err)).toBe('La ventana de robos no está abierta.');
  });

  it('returns a plain-text body (older backend format)', () => {
    const err = { response: { data: 'Invalid username or password' } };
    expect(extractErrorMessage(err)).toBe('Invalid username or password');
  });

  it('falls back to data.message when the body is a JSON object', () => {
    const err = { response: { data: { message: 'Something went wrong' } } };
    expect(extractErrorMessage(err)).toBe('Something went wrong');
  });

  it('falls back to err.message for a plain Error with no response', () => {
    expect(extractErrorMessage(new Error('Network Error'))).toBe('Network Error');
  });

  it('falls back to the provided fallback when nothing else is available', () => {
    expect(extractErrorMessage({}, 'Error al guardar')).toBe('Error al guardar');
    expect(extractErrorMessage(null, 'Error al guardar')).toBe('Error al guardar');
  });

  it('uses the default fallback when none is provided', () => {
    expect(extractErrorMessage({})).toBe('Error inesperado');
  });

  it('does not treat an empty/blank string body as a message', () => {
    const err = { response: { data: '   ' } };
    expect(extractErrorMessage(err, 'fallback')).toBe('fallback');
  });
});
