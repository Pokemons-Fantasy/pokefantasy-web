interface HttpErrorLike {
  response?: { status?: number; data?: unknown };
}

/** El backend dice que no hay sesión (cookie ausente, caducada o bloqueada por el navegador). */
export function isSessionExpired(err: unknown): boolean {
  const response = (err as HttpErrorLike | null)?.response;
  return response?.status === 401 && (response.data as { code?: string } | undefined)?.code === 'UNAUTHENTICATED';
}

/** Dónde y quién estaba cuando terminó la última sesión en esta pestaña (cierre o caducidad). */
export interface LastSession {
  user: string;
  path: string;
}

/**
 * A dónde ir tras iniciar sesión. `from` es la página que pedía sesión (la de ProtectedRoute). Si es la
 * página donde terminó la sesión de otra persona, no se vuelve a ella: es suya. Un enlace abierto después
 * (una invitación) sí se respeta, y la misma persona vuelve a donde estaba.
 */
export function loginDestination(
  from: { pathname: string; search?: string } | undefined,
  lastSession: LastSession | null,
  user: string,
): string {
  if (!from) return '/';
  const path = `${from.pathname}${from.search ?? ''}`;
  if (lastSession && lastSession.path === path && lastSession.user !== user) return '/';
  return path;
}
