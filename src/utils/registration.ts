/**
 * Reglas de registro, las mismas que valida el backend (CreateUserCommandHandler). Se comprueban aquí
 * para avisar antes de enviar; el backend sigue siendo quien decide.
 */
export const USERNAME_PATTERN = /^[A-Za-z0-9_-]{3,20}$/;
export const PASSWORD_MIN_LENGTH = 8;
/** bcrypt solo usa los primeros 72 bytes: más larga no aportaría nada (y el backend la rechaza). */
export const PASSWORD_MAX_BYTES = 72;

export function usernameError(username: string): string | null {
  if (!username) return null;
  return USERNAME_PATTERN.test(username)
    ? null
    : 'Entre 3 y 20 caracteres: letras, números, "_" o "-" (sin espacios ni tildes).';
}

export function passwordError(password: string): string | null {
  if (!password) return null;
  if (password.length < PASSWORD_MIN_LENGTH) return `Mínimo ${PASSWORD_MIN_LENGTH} caracteres.`;
  if (new TextEncoder().encode(password).length > PASSWORD_MAX_BYTES) return 'Demasiado larga (máximo 72 bytes).';
  return null;
}
