// Iconos de la web instalable desde el icono de la app (resources/icon.png, 1024x1024, fondo propio).
import sharp from 'sharp';
import { mkdirSync } from 'fs';

const BG = '#0a0a0f';
const OUT = 'public/icons';
mkdirSync(OUT, { recursive: true });

/** Icono cuadrado de `size` px; con `scale` < 1 el dibujo va centrado sobre el fondo de la app. */
async function icon(size, name, scale = 1) {
  const inner = Math.round(size * scale);
  const drawing = await sharp('resources/icon.png').resize(inner, inner).png().toBuffer();
  await sharp({ create: { width: size, height: size, channels: 4, background: BG } })
    .composite([{ input: drawing, gravity: 'center' }])
    .flatten({ background: BG }) // iOS no admite transparencia en el icono de la pantalla de inicio
    .png()
    .toFile(`${OUT}/${name}`);
  console.log(`✓ ${OUT}/${name}`);
}

await icon(192, 'icon-192.png');
await icon(512, 'icon-512.png');
// Maskable: el sistema recorta en círculo o squircle; el dibujo va al 80 % para que no se corte
await icon(512, 'icon-maskable-512.png', 0.8);
await icon(180, 'apple-touch-icon.png');
await icon(48, 'favicon-48.png');