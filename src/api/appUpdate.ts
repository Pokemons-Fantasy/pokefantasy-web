import axios from 'axios';

/** Última release publicada de la app (API pública de GitHub, sin sesión: no va por `apiClient`). */
export const LATEST_RELEASE_URL = 'https://api.github.com/repos/Pokemons-Fantasy/pokefantasy-web/releases/latest';

export interface LatestRelease {
  /** Sin la `v` del tag: `2.1.0`. */
  version: string;
  /** Novedades en markdown (cuerpo de la release). */
  notes: string;
  /** La APK; si la release no trae ninguna, la página de la release. */
  apkUrl: string;
  /** Página de la release en GitHub. */
  pageUrl: string;
}

/** Campos tal cual los devuelve GitHub. */
interface RawRelease {
  tag_name: string;
  body: string | null;
  html_url: string;
  assets: { name: string; browser_download_url: string }[];
}

export const getLatestRelease = async (): Promise<LatestRelease> => {
  const { data } = await axios.get<RawRelease>(LATEST_RELEASE_URL, {
    headers: { Accept: 'application/vnd.github+json' },
  });
  const apk = data.assets.find((a) => a.name.toLowerCase().endsWith('.apk'));
  return {
    version: data.tag_name.replace(/^v/, ''),
    notes: data.body ?? '',
    apkUrl: apk?.browser_download_url ?? data.html_url,
    pageUrl: data.html_url,
  };
};
