import { describe, it, expect } from 'vitest';

// Ficheros de la raíz leídos en crudo (como glossary.test.ts): el manifest, el HTML y los iconos
const raw = import.meta.glob(['/public/manifest.webmanifest', '/index.html'], {
  query: '?raw', import: 'default', eager: true,
}) as Record<string, string>;
const icons = Object.keys(import.meta.glob('/public/icons/*.png', { query: '?url', eager: true }));

describe('web instalable', () => {
  it('el manifest describe la app y sus iconos existen', () => {
    const manifest = JSON.parse(raw['/public/manifest.webmanifest']);
    expect(manifest).toMatchObject({ name: 'PokeFantasy', short_name: 'PokeFantasy', start_url: '/', display: 'standalone', lang: 'es' });
    const sources = manifest.icons.map((i: { src: string }) => `/public${i.src}`);
    expect(sources).toEqual(expect.arrayContaining(['/public/icons/icon-192.png', '/public/icons/icon-512.png', '/public/icons/icon-maskable-512.png']));
    sources.forEach((src: string) => expect(icons).toContain(src));
    expect(manifest.icons.some((i: { purpose?: string }) => i.purpose === 'maskable')).toBe(true);
  });

  it('index.html enlaza el manifest, el icono de Apple y el favicon nuevo', () => {
    const html = raw['/index.html'];
    expect(html).toContain('<link rel="manifest" href="/manifest.webmanifest"');
    expect(html).toContain('<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png"');
    expect(html).toContain('<meta name="apple-mobile-web-app-capable" content="yes"');
    expect(html).not.toContain('favicon.svg');
    expect(icons).toContain('/public/icons/apple-touch-icon.png');
    expect(icons).toContain('/public/icons/favicon-48.png');
    expect(icons).toContain('/public/icons/badge-96.png');
  });
});
