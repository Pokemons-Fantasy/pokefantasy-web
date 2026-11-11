import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import { getLatestRelease, LATEST_RELEASE_URL } from './appUpdate';

vi.mock('axios', () => ({ default: { get: vi.fn() } }));
const get = vi.mocked(axios.get);

const PAGE = 'https://github.com/Pokemons-Fantasy/pokefantasy-web/releases/tag/v2.1.0';
const APK = 'https://github.com/Pokemons-Fantasy/pokefantasy-web/releases/download/v2.1.0/PokeFantasy-2.1.0.apk';

describe('getLatestRelease', () => {
  beforeEach(() => get.mockReset());

  it('devuelve la versión sin "v", las notas, la APK y la página', async () => {
    get.mockResolvedValue({ data: {
      tag_name: 'v2.1.0', body: 'x', html_url: PAGE,
      assets: [
        { name: 'notes.txt', browser_download_url: 'https://example.com/notes.txt' },
        { name: 'PokeFantasy-2.1.0.apk', browser_download_url: APK },
      ],
    } });

    await expect(getLatestRelease()).resolves.toEqual({ version: '2.1.0', notes: 'x', apkUrl: APK, pageUrl: PAGE });
    expect(get).toHaveBeenCalledWith(LATEST_RELEASE_URL, { headers: { Accept: 'application/vnd.github+json' } });
  });

  it('sin asset .apk ni cuerpo: descarga desde la página y notas vacías', async () => {
    get.mockResolvedValue({ data: { tag_name: 'v2.1.0', body: null, html_url: PAGE, assets: [] } });

    await expect(getLatestRelease()).resolves.toEqual({ version: '2.1.0', notes: '', apkUrl: PAGE, pageUrl: PAGE });
  });
});
