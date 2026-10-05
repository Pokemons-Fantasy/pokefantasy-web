export const RENDER_API_URL = 'https://pokefantasy.onrender.com';

/**
 * Base de la API. En la web se usa `/api`, que Netlify (`netlify.toml`) y `vite dev` reenvían a
 * Render: así las cookies de sesión son del propio sitio y Safari/iOS no las bloquea como de terceros.
 * La app nativa (origin `https://localhost`) llama a Render directamente. `VITE_API_URL` manda siempre.
 */
export function resolveApiBaseUrl(envUrl: string | undefined, isNative: boolean): string {
  return envUrl ?? (isNative ? RENDER_API_URL : '/api');
}
