const SEMVER = /^(\d+)\.(\d+)\.(\d+)$/;

function parse(version: string): number[] | null {
  const match = SEMVER.exec(version.trim().replace(/^v/, ''));
  return match ? match.slice(1).map(Number) : null;
}

/** ¿`latest` (tag de la release, con o sin `v`) es posterior a `current`? Si alguna no es `X.Y.Z`, no. */
export function isNewerVersion(latest: string, current: string): boolean {
  const a = parse(latest);
  const b = parse(current);
  if (!a || !b) return false;
  for (let i = 0; i < 3; i++) {
    if (a[i] !== b[i]) return a[i] > b[i];
  }
  return false;
}

/** Una línea de markdown como texto plano: sin encabezado, viñeta, cita, enlace, código ni énfasis. */
function plain(line: string): string {
  return line
    .replace(/^\s*#+\s*/, '')
    .replace(/^\s*(?:[-*+]|\d+\.)\s+/, '')
    .replace(/^\s*>\s?/, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/\*\*|__|`/g, '')
    .replace(/\*(\S[^*]*?)\*/g, '$1')
    .trim();
}

/**
 * Novedades de la release (markdown de GitHub) como líneas de texto plano. Fuera: el título si lleva la
 * versión (ya la dice el aviso), la sección "Instalar" (el botón ya descarga), separadores y líneas con
 * URLs sueltas (p. ej. el "Full Changelog" de GitHub), que en el aviso no se pueden pulsar.
 */
export function releaseNoteLines(markdown: string): string[] {
  const lines: string[] = [];
  let first = true;
  let skipping = false;
  for (const raw of markdown.split(/\r?\n/)) {
    const trimmed = raw.trim();
    if (!trimmed) continue;
    const heading = /^#+\s/.test(trimmed);
    const isFirst = first;
    first = false;
    if (heading) {
      skipping = /^#+\s*instalar\b/i.test(trimmed);
      if (skipping || (isFirst && /\d+\.\d+\.\d+/.test(trimmed))) continue;
    }
    if (skipping || /^[-*_]{3,}$/.test(trimmed) || /https?:\/\/\S+/.test(trimmed.replace(/\]\([^)]*\)/g, ']'))) continue;
    const line = plain(raw);
    if (line) lines.push(line);
  }
  return lines;
}
