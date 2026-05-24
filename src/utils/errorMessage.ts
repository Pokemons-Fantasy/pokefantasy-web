export function extractErrorMessage(err: unknown, fallback = 'Error inesperado'): string {
  const backendMsg = (err as any)?.response?.data?.message;
  if (backendMsg) return backendMsg;
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}
