# Diseño móvil de app: subproyecto 1 (cimientos) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dejar el front listo para el shell móvil: `src/index.css` partido en ficheros por responsabilidad sin cambiar el CSS resultante, un único breakpoint móvil (`767px`) y el hook `useLayoutMode`.

**Architecture:** `src/styles/index.css` solo contiene `@import` de los parciales en el mismo orden que el fichero original; Vite los inlinea, así que el CSS compilado es idéntico y la cascada no cambia. Los ~9 breakpoints `640px` pasan a `767px` (y `min-width: 641px` a `768px`), el mismo valor que exporta `useLayoutMode`. El hook usa `matchMedia` con `useSyncExternalStore` y en la APK (Capacitor nativo) devuelve siempre `'mobile'`.

**Tech Stack:** React 19, Vite 8 (inlinado de `@import`), Vitest 4 + Testing Library (jsdom), `@capacitor/core` 8.

**Spec:** sin design doc (preferencia del usuario). El diseño aprobado en el brainstorming del 2026-11-10 se resume en la nota del vault `50 Features/Diseño móvil de app.md` (la crea la Task 4). Decisiones que este plan aplica:
- Escritorio intacto; diseño de app solo en móvil (navegador < 768 px y APK).
- Enfoque "shell intercambiable con componentes compartidos"; este subproyecto solo pone los cimientos.
- CSS existente partido mecánicamente sin cambio visual; lo nuevo del shell (subproyecto 2) usará CSS Modules.
- **Desviación respecto a lo hablado:** se dijo "`pages/XPage.css` importado por cada página". Importar CSS desde cada página hace que el orden del bundle dependa del grafo de imports de `App.tsx` y puede cambiar la cascada. Se usa en su lugar `src/styles/` con un `index.css` de `@import` ordenados. El usuario lo valida al revisar este plan.

## Global Constraints

- Rama `feature/movil-cimientos` desde `main` actualizado; PR contra `main` de `Pokemons-Fantasy/pokefantasy-web` con la API REST de GitHub (`$env:GITHUB_PERSONAL_ACCESS_TOKEN`, nunca imprimirlo). Sin `gh`.
- Commits con `git commit -F <fichero>` (UTF-8 sin BOM) desde PowerShell; mensajes en español, estilo `refactor(estilos): ...` / `feat(movil): ...`; terminar con `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Breakpoint móvil: `max-width: 767px`; escritorio desde `768px`. El de `480px` (línea ~871) no se toca.
- Ningún cambio en el backend ni en `openapi.json` / `schema.d.ts`.
- `rtk` oculta la salida de vitest: ejecutar tests con `rtk proxy npx vitest run <ruta>`. Check de tipos: `./node_modules/.bin/tsc -p tsconfig.app.json --noEmit`.
- Antes del push, lo mismo que la CI: `npm run lint`, `npm run api:check`, `npm test`, `npm run build`.
- Comentarios del CSS se conservan tal cual (están en español y documentan decisiones).

## Review Focus

1. **Orden de la cascada al partir el fichero**: la concatenación de los parciales en el orden de `@import` debe ser byte a byte igual al `index.css` original, y el CSS compilado de `dist/` idéntico al de `main`. Lo comprueban los Steps 3 y 5 de la Task 1.
2. **Navegador sin `matchMedia`** (jsdom, WebView antiguo): `useLayoutMode` devuelve `'desktop'` sin lanzar. Test en la Task 3.
3. **Tablet o APK con ancho ≥ 768 px**: en nativo sigue siendo `'mobile'`. Test en la Task 3.
4. **Rango 641-767 px**: es el único cambio visual intencionado (pasa a estilos móviles). Se comprueba con capturas a 700 px en la Task 2.
5. **Tema claro** (`.theme-light`, líneas ~69-128): queda en `tokens.css` en el mismo sitio relativo; las capturas en tema claro de la Task 2 lo cubren.

---

### Task 1: Partir `index.css` sin cambiar el CSS compilado

**Files:**
- Create: `src/styles/index.css` y los parciales de la tabla
- Modify: `src/main.tsx` (`import './index.css'` → `import './styles/index.css'`)
- Delete: `src/index.css`

**Interfaces:**
- Produces: `src/styles/index.css` como única entrada de estilos globales; Task 2 edita los parciales, Task 4 lo documenta.

Cortes: cada parcial va desde su línea de inicio (incluida) hasta justo antes de la línea de inicio del siguiente. Las líneas son las de `main` a 2026-11-10; si se han movido, cortar por el comentario marcador indicado (es único en el fichero).

| # | Parcial | Empieza en (línea aprox. · marcador) |
|---|---|---|
| 1 | `tokens.css` | 1 · `:root` |
| 2 | `base.css` | 129 · `/* Los controles de formulario no heredan` |
| 3 | `auth.css` | 218 · `/* ─── AUTH ─── */` |
| 4 | `layout.css` | 360 · `/* ─── LAYOUT ─── */` |
| 5 | `typography.css` | 575 · `/* ─── TYPOGRAPHY ─── */` |
| 6 | `components.css` | 621 · `/* ─── BUTTONS ─── */` |
| 7 | `showdown.css` | 853 · `/* ─── PANEL DE ADMINISTRACIÓN ─── */` |
| 8 | `pokemon.css` | 989 · `/* ─── BADGES ─── */` |
| 9 | `draft.css` | 1156 · `/* ─── DRAFT ─── */` |
| 10 | `modal.css` | 1372 · `/* ─── MODAL ─── */` |
| 11 | `draft-board.css` | 1442 · `/* ─── DRAFT BOARD` |
| 12 | `teams.css` | 1560 · `/* ─── MERCADO Y RIVALES` |
| 13 | `standings.css` | 1731 · `/* ─── CLASIFICACIÓN ─── */` |
| 14 | `home.css` | 1809 · `/* ─── HOME HERO ─── */` |
| 15 | `league-layout.css` | 2120 · `/* ─── LEAGUE LAYOUT` |
| 16 | `schedule.css` | 2218 · `/* ─── SCHEDULE / JORNADAS ─── */` |
| 17 | `config.css` | 2364 · `/* ─── COIN BADGE ─── */` |
| 18 | `responsive.css` | 2511 · `/* ─── RESPONSIVE ─── */` |
| 19 | `activity.css` | 2715 · `/* ─── ACTIVIDAD` |
| 20 | `pool.css` | 2778 · `/* ─── POOL` |
| 21 | `admin.css` | 2968 · `/* ─── ADMIN (L5) ─── */` |

- [ ] **Step 1: Crear la rama y guardar el CSS compilado de referencia**

Run (PowerShell, en `pokefantasy-web`): `git switch main; git pull; git switch -c feature/movil-cimientos; npm run build; Copy-Item (Get-ChildItem dist/assets/index-*.css).FullName $env:TEMP\css-antes.css`
Expected: build OK y `css-antes.css` copiado.

- [ ] **Step 2: Partir el fichero con un script desechable**

Script Node en el scratchpad (no se commitea) que lee `src/index.css`, localiza cada marcador de la tabla (debe aparecer exactamente una vez; si no, abortar), corta por esas líneas sin tocar ningún byte (conserva CRLF/LF tal cual) y escribe los 21 parciales en `src/styles/`. Después crea `src/styles/index.css` con una cabecera de comentario de una línea ("Entrada de estilos globales: el orden de los @import es el de la cascada, no reordenar.") y los 21 `@import './<parcial>';` en el orden de la tabla.

- [ ] **Step 3: Comprobar que la concatenación es idéntica al original**

Run: script desechable que concatena los parciales en el orden de los `@import` de `src/styles/index.css` y compara con `git show main:src/index.css` byte a byte.
Expected: `IGUAL`. Si difiere, corregir los cortes antes de seguir.

- [ ] **Step 4: Cambiar la entrada en `main.tsx` y borrar `src/index.css`**

`import './styles/index.css'` en el mismo sitio que el import actual (después de las fuentes, antes de `App`). `git rm src/index.css`.

- [ ] **Step 5: Comparar el CSS compilado**

Run: `npm run build; Compare-Object (Get-Content $env:TEMP\css-antes.css) (Get-Content (Get-ChildItem dist/assets/index-*.css).FullName)`
Expected: sin salida (idénticos). Si Vite introduce solo diferencias de espacios o de orden por el `@import`, parar e investigar; no se acepta ninguna regla movida.

- [ ] **Step 6: Lint, tipos y tests**

Run: `npm run lint; ./node_modules/.bin/tsc -p tsconfig.app.json --noEmit; rtk proxy npx vitest run`
Expected: todo en verde (ningún test importa `index.css`; si alguno lo hace, actualizar la ruta).

- [ ] **Step 7: Commit**

Mensaje: `refactor(estilos): partir index.css en src/styles sin cambiar el CSS compilado`.

---

### Task 2: Unificar el breakpoint móvil en 767px

**Files:**
- Modify: los parciales que contienen `@media (max-width: 640px)` (8 apariciones, una en cada uno: `draft-board.css`, `teams.css`, `league-layout.css`, `schedule.css`, `config.css`, `responsive.css`, `activity.css`, `pool.css`) y `@media (min-width: 641px)` (`pool.css`).
- Create: `.claude/launch.json` si no existe, con `{ "name": "web", "runtimeExecutable": "npm", "runtimeArgs": ["run", "dev"], "port": 5173 }`.

**Interfaces:**
- Consumes: estructura de la Task 1.
- Produces: breakpoint `767px` / `768px`, el valor que exporta la Task 3 (`MOBILE_MAX_WIDTH`).

- [ ] **Step 1: Capturas "antes"**

Con `main` compilado (o el commit de la Task 1, que es idéntico): `preview_start` con `web` y sesión iniciada (si `.env.local` apunta al backend local, arrancarlo; si no hay backend local, quitar temporalmente `VITE_API_URL` para usar producción con la cuenta de pruebas, sin commitear nada). Capturas de Home, Equipos, Calendario, Clasificación, Actividad, Pool y Configuración a 375, 700 y 1280 px de ancho, tema oscuro, y Equipos y Pool también en tema claro. Guardar en el scratchpad.

- [ ] **Step 2: Sustituir los breakpoints**

`max-width: 640px` → `max-width: 767px` en las 8 apariciones; `min-width: 641px` → `min-width: 768px` en la de `pool.css`. Nada más.

Run: `grep -rn "640px\|641px" src/styles` → Expected: sin resultados.

- [ ] **Step 3: Diff del CSS compilado**

Run: `npm run build` y comparar con `css-antes.css`.
Expected: las únicas diferencias son los 9 valores de breakpoint.

- [ ] **Step 4: Capturas "después" y comparación**

Mismas pantallas y anchos que el Step 1.
Expected: 375 y 1280 px idénticas a las de "antes". A 700 px las páginas pasan a su variante móvil (cabecera solo con avatar, tira de filtros del Pool deslizable, etc.) sin desbordes horizontales ni solapes. Revisar a 700 px que no haya scroll horizontal: `document.documentElement.scrollWidth <= innerWidth` con `javascript_tool`.

- [ ] **Step 5: Commit**

Mensaje: `refactor(estilos): breakpoint movil unico en 767px`.

---

### Task 3: Hook `useLayoutMode`

**Files:**
- Create: `src/hooks/useLayoutMode.ts`
- Test: `src/hooks/useLayoutMode.test.ts`

**Interfaces:**
- Produces (lo usa el subproyecto 2 en `LeagueLayout`):
  - `export type LayoutMode = 'mobile' | 'desktop'`
  - `export const MOBILE_MAX_WIDTH = 767`
  - `export const MOBILE_QUERY = '(max-width: 767px)'`
  - `export function useLayoutMode(): LayoutMode`

- [ ] **Step 1: Tests que fallan**

Mock de `@capacitor/core` (`vi.mock`, `Capacitor.isNativePlatform` como `vi.fn`) y un `matchMedia` falso instalado en `window` por test (objeto con `matches`, `addEventListener('change')`, `removeEventListener`, y un helper para disparar el cambio). Tests con `renderHook`:
- `MOBILE_QUERY` es `'(max-width: 767px)'` y `MOBILE_MAX_WIDTH` es `767`.
- con `matches: false` devuelve `'desktop'`; con `matches: true`, `'mobile'`.
- `matchMedia` se llama con `MOBILE_QUERY`.
- al disparar `change` con `matches: true` (dentro de `act`) pasa de `'desktop'` a `'mobile'`.
- con `isNativePlatform()` → `true` y `matches: false` devuelve `'mobile'`.
- sin `window.matchMedia` (borrado en el test) devuelve `'desktop'` sin lanzar.
- al desmontar se llama a `removeEventListener` con el mismo listener.

- [ ] **Step 2: Ejecutar y ver que fallan**

Run: `rtk proxy npx vitest run src/hooks/useLayoutMode.test.ts`
Expected: FAIL (módulo inexistente).

- [ ] **Step 3: Implementar**

`useSyncExternalStore(subscribe, getSnapshot)`: `subscribe` registra `change` en `window.matchMedia(MOBILE_QUERY)` y devuelve la baja; `getSnapshot` devuelve el booleano `matches` (o `false` si no hay `matchMedia`). El hook devuelve `'mobile'` si `Capacitor.isNativePlatform()` o si coincide la query; si no, `'desktop'`. Comentario breve en español en la cabecera explicando que el valor debe coincidir con los `@media (max-width: 767px)` de `src/styles`.

- [ ] **Step 4: Tests en verde**

Run: `rtk proxy npx vitest run src/hooks/useLayoutMode.test.ts; ./node_modules/.bin/tsc -p tsconfig.app.json --noEmit; npm run lint`
Expected: PASS y sin errores.

- [ ] **Step 5: Commit**

Mensaje: `feat(movil): hook useLayoutMode con el breakpoint de 767px`.

---

### Task 4: Documentación, verificación completa y PR

**Files:**
- Modify: `CLAUDE.md` del front, §7 fila "Estilos": `Estilos globales en src/styles/ (entrada index.css, orden de @import = cascada; tokens en tokens.css); componentes nuevos del shell móvil con CSS Modules; breakpoint móvil 767px (useLayoutMode); colores de tier en utils/colors.ts`.
- Vault (`C:\PokeFantasy\vault`, `git pull` antes, commit directo a `main` y push):
  - Create `70 Decisiones/ADR-021 Estructura del CSS y CSS Modules.md` (plantilla de decisión, `estado: aceptada`, `area: front`, `fecha: 2026-11-10`): contexto (90 KB en un fichero, rediseño móvil con dos layouts), opciones (todo en un fichero; CSS por página importado desde cada página; `src/styles` con `@import` ordenados + CSS Modules para lo nuevo), decisión (la tercera, con el motivo de la cascada), consecuencias.
  - Create `50 Features/Diseño móvil de app.md` (plantilla de feature, `area: front`, `estado: en-curso`, `prs_front` con el PR de esta tarea): objetivo (la mayoría juega desde el móvil; la web se ve encogida; APK nueva al final), decisiones del brainstorming (escritorio intacto, barra inferior de liga por fase con "Más", `/` → última liga activa en móvil, identidad visual actual, mejoras de UX tipo B, sin swipe), subproyectos 1-4 con su estado, y enlace a este plan.
  - Create `50 Features/Puntos por jornada.md` y `50 Features/Valor dinámico de los Pokémon.md` con `estado: idea` (ideas de la opción C, una línea de "Qué y por qué" cada una, inspiradas en la estructura de LaLiga Fantasy).
  - Modify `40 Frontend/Convenciones frontend.md`: línea "Tema" → variables en `src/styles/tokens.css`; nueva línea "Estilos" con la misma regla que el CLAUDE.md y enlace a [[ADR-021 Estructura del CSS y CSS Modules]].
  - Modify `40 Frontend/Estructura frontend.md`: fila nueva `styles/` y `useLayoutMode` en la fila `hooks/`.

- [ ] **Step 1: Editar CLAUDE.md del front y las notas del vault**

- [ ] **Step 2: Verificación completa**

Run: `npm run lint; npm run api:check; npm test; npm run build`
Expected: todo en verde.

- [ ] **Step 3: Commit del front y push**

Mensaje: `docs: estilos en src/styles y breakpoint movil`. `git push -u origin feature/movil-cimientos`.

- [ ] **Step 4: Abrir el PR**

`Invoke-RestMethod` POST a `repos/Pokemons-Fantasy/pokefantasy-web/pulls` (`head: feature/movil-cimientos`, `base: main`). Cuerpo: qué cambia (3 bloques), cómo se verificó (concatenación idéntica, diff del CSS compilado, capturas a 375/700/1280), la desviación sobre `pages/XPage.css` y el único cambio visual intencionado (641-767 px). Terminar con `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.

- [ ] **Step 5: Vault**

Añadir el número del PR a `prs_front` de `Diseño móvil de app.md` y a la ADR; commit y push del vault.
