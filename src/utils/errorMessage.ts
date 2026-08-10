interface ErrorWithResponseData {
  response?: { data?: unknown };
}

export function extractErrorMessage(err: unknown, fallback = 'Error inesperado'): string {
  // ApiExceptionHandler (backend) devuelve el mensaje como texto plano
  // (Content-Type: text/plain), no como JSON { message }.
  const data = (err as ErrorWithResponseData | null)?.response?.data;
  if (typeof data === 'string' && data.trim()) return data;
  const backendMsg = (data as { message?: string } | null)?.message;
  if (backendMsg) return backendMsg;
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}
