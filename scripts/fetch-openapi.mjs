// Descarga la especificación OpenAPI del backend y la guarda (formateada) en openapi.json.
// Uso: npm run api:spec [-- <url>]   (por defecto el backend local, http://localhost:8080/v3/api-docs)
// El back sirve /v3/api-docs solo si se arranca con API_DOCS_ENABLED=true (apagado por defecto).
// Luego `npm run api:types` regenera src/api/schema.d.ts.
import { writeFile } from 'node:fs/promises';

const url = process.argv[2] ?? 'http://localhost:8080/v3/api-docs';
const res = await fetch(url);
if (!res.ok) {
  console.error(`No se pudo descargar ${url}: HTTP ${res.status}. ¿Arrancaste el back con API_DOCS_ENABLED=true?`);
  process.exit(1);
}
const spec = await res.json();
await writeFile('openapi.json', JSON.stringify(spec, null, 4) + '\n');
console.log(`openapi.json actualizado desde ${url} (${Object.keys(spec.paths ?? {}).length} rutas)`);
