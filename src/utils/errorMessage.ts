interface ErrorWithResponseData {
  response?: { data?: unknown };
}

export function extractErrorMessage(err: unknown, fallback = 'Error inesperado'): string {
  // El backend responde los errores como ProblemDetail (application/problem+json) con el texto en
  // `message` (y `detail`), además de `code` y `requestId`. Se acepta también texto plano (versiones
  // antiguas del backend o proxies).
  const data = (err as ErrorWithResponseData | null)?.response?.data;
  if (typeof data === 'string' && data.trim()) return data;
  const backendMsg = (data as { message?: string } | null)?.message;
  if (backendMsg) return backendMsg;
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}
