interface HttpErrorLike {
  response?: { status?: number; data?: unknown };
}

/** El backend dice que no hay sesión (cookie ausente, caducada o bloqueada por el navegador). */
export function isSessionExpired(err: unknown): boolean {
  const response = (err as HttpErrorLike | null)?.response;
  return response?.status === 401 && (response.data as { code?: string } | undefined)?.code === 'UNAUTHENTICATED';
}
