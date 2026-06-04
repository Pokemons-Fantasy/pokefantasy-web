import sharp from 'sharp';
import { mkdirSync } from 'fs';

mkdirSync('resources', { recursive: true });

const GOLD = '#fbbf24';
const BG = '#0a0a0f';

const iconSvg = `<svg width="1024" height="1024" xmlns="http://www.w3.org/2000/svg">
  <rect width="1024" height="1024" fill="${BG}"/>
  <text
    x="512" y="640"
    text-anchor="middle"
    font-family="monospace"
    font-weight="bold"
    font-size="480"
    fill="${GOLD}"
    letter-spacing="-20"
  >PF</text>
</svg>`;

const splashSvg = `<svg width="2732" height="2732" xmlns="http://www.w3.org/2000/svg">
  <rect width="2732" height="2732" fill="${BG}"/>
  <text
    x="1366" y="1640"
    text-anchor="middle"
    font-family="monospace"
    font-weight="bold"
    font-size="1200"
    fill="${GOLD}"
    letter-spacing="-40"
  >PF</text>
</svg>`;

await sharp(Buffer.from(iconSvg)).png().toFile('resources/icon.png');
console.log('✓ resources/icon.png');

await sharp(Buffer.from(splashSvg)).png().toFile('resources/splash.png');
console.log('✓ resources/splash.png');
