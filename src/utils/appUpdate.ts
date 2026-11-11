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

/**
 * Novedades de la release (markdown de GitHub) como líneas de texto: sin `#`, viñetas ni `**`, y sin la
 * sección "Instalar", que en la app no aplica (el botón ya descarga).
 */
export function releaseNoteLines(markdown: string): string[] {
  const lines: string[] = [];
  for (const raw of markdown.split(/\r?\n/)) {
    if (/^#+\s*instalar\b/i.test(raw.trim())) break;
    const line = raw.replace(/^\s*#+\s*/, '').replace(/^\s*[-*]\s+/, '').replaceAll('**', '').trim();
    if (line) lines.push(line);
  }
  return lines;
}
