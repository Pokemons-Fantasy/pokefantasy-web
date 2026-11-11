import { describe, it, expect } from 'vitest';
import { isNewerVersion, releaseNoteLines } from './appUpdate';

describe('isNewerVersion', () => {
  it.each([
    ['v2.1.0', '2.0.1', true],
    ['2.0.10', '2.0.9', true],
    ['v3.0.0', '2.9.9', true],
    ['v2.0.1', '2.0.1', false],
    ['v2.0.0', '2.0.1', false],
    ['v2.1', '2.0.1', false],
    ['2.1.0-beta', '2.0.1', false],
    ['', '2.0.1', false],
  ])('%s frente a %s → %s', (latest, current, expected) => {
    expect(isNewerVersion(latest, current)).toBe(expected);
  });
});

describe('releaseNoteLines', () => {
  it('quita marcas de markdown, líneas vacías, el título con la versión y la sección Instalar', () => {
    const md = '## PokeFantasy 2.1.0\n\n### Arreglado\n- **Calendario**: sprites.\n\n### Instalar\nDescarga la APK.';
    expect(releaseNoteLines(md)).toEqual(['Arreglado', 'Calendario: sprites.']);
  });

  it('limpia enlaces, código, cursiva y listas numeradas; sigue tras "Instalar" si hay más secciones', () => {
    const md = [
      '# PokeFantasy 2.1.0',
      '1. Arreglo en [#12](https://github.com/x/y/pull/12)',
      '2. `Calendario` *más* rápido y __claro__',
      '### Instalar',
      'Descarga la APK.',
      '---',
      '### Conocido',
      '- Nada',
      '**Full Changelog**: https://github.com/x/y/compare/v2.0.1...v2.1.0',
    ].join('\n');
    expect(releaseNoteLines(md)).toEqual([
      'Arreglo en #12', 'Calendario más rápido y claro', 'Conocido', 'Nada',
    ]);
  });

  it('un título sin versión se conserva', () => {
    expect(releaseNoteLines('## Novedades\n- Uno')).toEqual(['Novedades', 'Uno']);
  });

  it('acepta saltos de línea de Windows', () => {
    expect(releaseNoteLines('### Arreglado\r\n- Uno\r\n')).toEqual(['Arreglado', 'Uno']);
  });

  it('sin cuerpo devuelve una lista vacía', () => {
    expect(releaseNoteLines('')).toEqual([]);
  });
});
