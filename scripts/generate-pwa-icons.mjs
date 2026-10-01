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

// Icono pequeño de los avisos (badge): Android lo pinta solo con la transparencia, así que va monocromo:
// las letras del icono en blanco sobre fondo transparente, recortadas y centradas con margen.
const SIZE = 96;
const INNER = 80;
// Dos pasos: sharp recorta (trim) antes de aplicar el umbral si van en la misma cadena
const binary = await sharp('resources/icon.png').removeAlpha().greyscale().threshold(80).png().toBuffer();
const letters = await sharp(binary).trim().toBuffer();
const mask = await sharp(letters)
  .resize(INNER, INNER, { fit: 'contain', background: '#000000' })
  .extend({ top: 8, bottom: 8, left: 8, right: 8, background: '#000000' })
  .extractChannel(0)
  .raw()
  .toBuffer();
if (mask.length !== SIZE * SIZE) throw new Error(`máscara del badge con tamaño inesperado: ${mask.length}`);
await sharp({ create: { width: SIZE, height: SIZE, channels: 3, background: '#ffffff' } })
  .joinChannel(mask, { raw: { width: SIZE, height: SIZE, channels: 1 } })
  .png()
  .toFile(`${OUT}/badge-96.png`);
console.log(`✓ ${OUT}/badge-96.png`);
