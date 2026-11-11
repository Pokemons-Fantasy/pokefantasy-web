import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AppUpdateNotice from './AppUpdateNotice';
import * as appUpdateApi from '../api/appUpdate';
import type { LatestRelease } from '../api/appUpdate';

vi.mock('../api/appUpdate', async (importOriginal) => ({
  ...(await importOriginal<typeof appUpdateApi>()),
  getLatestRelease: vi.fn(),
}));
const getLatestRelease = vi.mocked(appUpdateApi.getLatestRelease);

const PAGE = 'https://github.com/Pokemons-Fantasy/pokefantasy-web/releases/tag/v2.1.0';
const APK = 'https://github.com/Pokemons-Fantasy/pokefantasy-web/releases/download/v2.1.0/PokeFantasy-2.1.0.apk';
const release = (version: string): LatestRelease => ({
  version,
  notes: `## PokeFantasy ${version}\n\n### Arreglado\n- **Calendario**: sprites.\n\n### Instalar\nDescarga la APK.`,
  apkUrl: APK,
  pageUrl: PAGE,
});

function renderNotice() {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <AppUpdateNotice currentVersion="2.0.1" />
    </QueryClientProvider>,
  );
}

/** Espera a que la consulta termine (con o sin aviso). */
async function settled() {
  await waitFor(() => expect(getLatestRelease).toHaveBeenCalled());
  await new Promise((r) => setTimeout(r, 0));
}

describe('AppUpdateNotice', () => {
  beforeEach(() => {
    getLatestRelease.mockReset();
    localStorage.clear();
  });
  afterEach(() => vi.restoreAllMocks());

  it('con una versión más nueva muestra las novedades y los enlaces', async () => {
    getLatestRelease.mockResolvedValue(release('2.1.0'));
    renderNotice();

    expect(await screen.findByRole('dialog', { name: 'Nueva versión 2.1.0' })).toBeInTheDocument();
    expect(screen.getAllByRole('listitem').map((li) => li.textContent))
      .toEqual(['PokeFantasy 2.1.0', 'Arreglado', 'Calendario: sprites.']);
    expect(screen.queryByText(/Descarga la APK/)).not.toBeInTheDocument();
    const download = screen.getByRole('link', { name: 'Descargar' });
    expect(download).toHaveAttribute('href', APK);
    expect(download).toHaveAttribute('target', '_blank');
    expect(screen.getByRole('link', { name: 'Ver en GitHub' })).toHaveAttribute('href', PAGE);
  });

  it('con la misma versión no avisa', async () => {
    getLatestRelease.mockResolvedValue(release('2.0.1'));
    renderNotice();
    await settled();

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('"Ahora no" cierra y no vuelve a avisar de esa versión', async () => {
    getLatestRelease.mockResolvedValue(release('2.1.0'));
    const { unmount } = renderNotice();
    await userEvent.setup().click(await screen.findByRole('button', { name: 'Ahora no' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(localStorage.getItem('pf:update-dismissed')).toBe('2.1.0');

    unmount();
    renderNotice();
    await settled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('una versión descartada antes no tapa una más nueva', async () => {
    localStorage.setItem('pf:update-dismissed', '2.0.5');
    getLatestRelease.mockResolvedValue(release('2.1.0'));
    renderNotice();

    expect(await screen.findByRole('dialog', { name: 'Nueva versión 2.1.0' })).toBeInTheDocument();
  });

  it('si GitHub falla no muestra nada', async () => {
    getLatestRelease.mockRejectedValue(new Error('network'));
    renderNotice();
    await settled();

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('sin localStorage disponible sigue avisando', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('denied'); });
    getLatestRelease.mockResolvedValue(release('2.1.0'));
    renderNotice();

    expect(await screen.findByRole('dialog', { name: 'Nueva versión 2.1.0' })).toBeInTheDocument();
  });
});
