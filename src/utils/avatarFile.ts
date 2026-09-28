/** Tamaño máximo de la foto original que se deja abrir en el editor (las de móvil rondan 3-8 MB). */
export const MAX_AVATAR_SOURCE_BYTES = 15 * 1024 * 1024;

/** Mensaje de error si el fichero no sirve como foto de perfil; null si vale. */
export function avatarFileError(file: File): string | null {
  if (!file.type.startsWith('image/')) return 'Elige una imagen (JPG, PNG, WebP...).';
  if (file.size > MAX_AVATAR_SOURCE_BYTES) return 'La imagen no puede pasar de 15 MB.';
  return null;
}

/**
 * Estilo de la `<img>` de la vista previa (dentro de un contenedor cuadrado con `overflow: hidden`)
 * para que se vea solo el área recortada. `area` va en % de la imagen: el ancho escala la imagen y el
 * `translate` (en % del propio tamaño de la imagen) la desplaza hasta el origen del recorte.
 */
export function previewImageStyle(area: { x: number; y: number; width: number }): { width: string; transform: string } {
  return {
    width: `${(100 / area.width) * 100}%`,
    transform: `translate(-${area.x}%, -${area.y}%)`,
  };
}
