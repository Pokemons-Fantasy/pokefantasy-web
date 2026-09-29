import { describe, it, expect } from 'vitest';
import ts from 'typescript';

/**
 * Glosario de la interfaz (vault: "Glosario de la interfaz"). La web está en español de España; la jerga
 * de las ligas draft (draft, pick, tier, pool) se mantiene. Este test falla si un texto visible usa un
 * término vetado.
 */
const VETADOS: { termino: RegExp; usar: string }[] = [
  { termino: /\bbancas?\b/i, usar: 'banquillo' },
  { termino: /\blinks?\b/i, usar: 'enlace' },
  { termino: /\btomad[oa]s?\b/i, usar: 'nominado / elegido' },
  { termino: /\btrades?\b/i, usar: 'intercambio' },
  { termino: /\bswaps?\b/i, usar: 'intercambio' },
  { termino: /\bclick\b/i, usar: 'clic' },
  { termino: /\bpickeando\b/i, usar: 'eligiendo' },
  { termino: /\b(expandir|colapsar)\b/i, usar: 'desplegar / plegar' },
  { termino: /\bsetup\b/i, usar: 'preparación' },
  { termino: /\bstats\b/i, usar: 'estadísticas' },
  { termino: /\bexpirad[oa]s?\b/i, usar: 'caducado' },
  { termino: /\bpokémons\b/i, usar: 'Pokémon (invariable)' },
  { termino: /(^|[^\p{L}])pokémon/u, usar: 'Pokémon (con mayúscula)' },
];

/** Atributos JSX cuyo valor ve (u oye) el usuario. */
const ATRIBUTOS_VISIBLES = new Set(['title', 'aria-label', 'placeholder', 'alt', 'label']);

const fuentes = import.meta.glob(['./**/*.{ts,tsx}', '!./**/*.test.{ts,tsx}', '!./**/*.d.ts', '!./test/**'], {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

/**
 * Un literal es texto visible si es texto JSX, el valor de un atributo visible, o una cadena con espacios
 * o que empieza por mayúscula (las claves, rutas y clases CSS son una sola palabra en minúscula).
 */
function textosVisibles(archivo: string, codigo: string): { linea: number; texto: string }[] {
  const kind = archivo.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const sf = ts.createSourceFile(archivo, codigo, ts.ScriptTarget.Latest, true, kind);
  const encontrados: { linea: number; texto: string }[] = [];

  function add(node: ts.Node, texto: string, siempre: boolean) {
    if (!siempre && !/\s/.test(texto.trim()) && !/^\p{Lu}/u.test(texto)) return;
    encontrados.push({ linea: sf.getLineAndCharacterOfPosition(node.getStart()).line + 1, texto });
  }

  function visit(node: ts.Node) {
    // Las clases CSS nunca se ven ("row-link standing-name" no es un "link")
    if (ts.isJsxAttribute(node) && node.name.getText() === 'className') return;
    const padre = node.parent;
    const enAtributoVisible = padre && ts.isJsxAttribute(padre) && ATRIBUTOS_VISIBLES.has(padre.name.getText());
    if (ts.isJsxText(node)) add(node, node.text, true);
    else if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      if (padre && (ts.isImportDeclaration(padre) || ts.isExportDeclaration(padre) || ts.isLiteralTypeNode(padre))) return;
      add(node, node.text, !!enAtributoVisible);
    } else if (ts.isTemplateExpression(node)) {
      // Sin separador: "/v1/leagues/${id}/trades" sigue siendo una ruta (sin espacios)
      const partes = [node.head.text, ...node.templateSpans.map((s) => s.literal.text)].join('');
      add(node, partes, false);
    }
    ts.forEachChild(node, visit);
  }
  visit(sf);
  return encontrados;
}

describe('glosario de la interfaz', () => {
  it('lee los fuentes', () => {
    expect(Object.keys(fuentes).length).toBeGreaterThan(50);
  });

  it('ningún texto visible usa un término vetado', () => {
    const errores: string[] = [];
    for (const [archivo, codigo] of Object.entries(fuentes)) {
      for (const { linea, texto } of textosVisibles(archivo, codigo)) {
        for (const { termino, usar } of VETADOS) {
          if (termino.test(texto)) errores.push(`${archivo}:${linea} "${texto.trim()}" → usar ${usar}`);
        }
      }
    }
    expect(errores).toEqual([]);
  });
});
