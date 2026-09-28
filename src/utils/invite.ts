/** Web pública (Netlify): el destino de los links que se comparten desde la app Android. */
export const PUBLIC_WEB_URL = 'https://pokefantasy.netlify.app';

/**
 * Link de invitación para compartir. En la app nativa el origin es `https://localhost` y el esquema
 * `pokefantasy://` no es clicable en los chats ni abre nada sin la app, así que se usa la web pública.
 */
export function inviteUrl(token: string, isNative: boolean, origin: string): string {
  return `${isNative ? PUBLIC_WEB_URL : origin}/invite/${token}`;
}
