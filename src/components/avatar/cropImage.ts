import type { Area } from 'react-easy-crop';

/** Lado en px de la foto que se sube (el backend acepta hasta 512). */
export const AVATAR_SIZE = 256;
const JPEG_QUALITY = 0.85;

/** Carga una imagen (object URL del fichero elegido). Falla si el navegador no sabe decodificarla (p. ej. HEIC). */
export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('No se puede abrir esta imagen'));
    image.src = src;
  });
}

/** Recorta `area` (px de la imagen original) y la reduce a un JPEG cuadrado de AVATAR_SIZE. */
export function cropToJpeg(image: HTMLImageElement, area: Area): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = AVATAR_SIZE;
  canvas.height = AVATAR_SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) return Promise.reject(new Error('Este navegador no permite recortar imágenes'));
  // JPEG no tiene transparencia: sin fondo, las zonas transparentes de un PNG saldrían negras.
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, AVATAR_SIZE, AVATAR_SIZE);
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(image, area.x, area.y, area.width, area.height, 0, 0, AVATAR_SIZE, AVATAR_SIZE);
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('No se pudo generar la imagen'))),
      'image/jpeg',
      JPEG_QUALITY,
    );
  });
}
