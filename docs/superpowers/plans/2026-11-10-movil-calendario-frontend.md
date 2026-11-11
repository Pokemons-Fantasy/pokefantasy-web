# Diseño móvil de app: subproyecto 3, pantalla Calendario Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** En móvil, el Calendario muestra una tira de chips de jornadas (J1, J2...) y debajo solo la jornada elegida, con tu partido primero y sus acciones; si tu próximo partido es de otra jornada, un aviso lleva a ella. El escritorio no cambia.

**Architecture:** Igual que Equipos: la lógica de `SchedulePage` pasa a `pages/schedule/useSchedulePage`, los modales a `ScheduleModals`, el JSX actual a `ScheduleDesktopView`, y se añade `ScheduleMobileView`. `SchedulePage` elige con `useLayoutMode()`. La lista de partidos de `JornadaCard` se extrae a `JornadaMatches` para compartirla. La jornada vive en la URL (`?jornada=`).

**Tech Stack:** React 19, react-router-dom 7, TanStack Query 5, Vitest + Testing Library. Reutiliza `jornadaStates`, `nextMatchFor` (`utils/schedule`), `formatDay` (`utils/dates`) y `MatchRow`.

**Spec:** sin design doc (preferencia del usuario). Diseño aprobado en conversación el 2026-11-10 con bocetos: estructura A (selector de jornada), nada encima de la tira salvo el aviso de próximo partido, enfoque "hook + dos vistas". Contexto: vault `50 Features/Diseño móvil de app.md`.

## Global Constraints

- Rama `feature/movil-calendario` desde `feature/movil-equipos` actualizada. PR con `base: feature/movil-equipos` (stack; se mergea todo junto). API REST de GitHub con `$env:GITHUB_PERSONAL_ACCESS_TOKEN`, sin `gh`, sin imprimir el token.
- Commits con `git commit -F` (UTF-8 sin BOM), en español, terminando en `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Escritorio idéntico: `src/pages/SchedulePage.test.tsx` y `src/components/schedule/*.test.tsx` pasan **sin modificarlos**.
- Componentes nuevos con CSS Modules. Textos según el glosario (`src/glossary.test.ts`).
- Jornada en la URL: `?jornada=<roundNumber>`, cambios con `replace: true`. Valor ausente, no numérico o inexistente = jornada por defecto.
- Ediciones de ficheros existentes con la herramienta Edit (no scripts con regex en bash: los finales de línea son CRLF en la copia de trabajo).
- Tests con `rtk proxy npx vitest run <ruta>`; tipos con `./node_modules/.bin/tsc -p tsconfig.app.json --noEmit`.

## Review Focus

1. **Temporada terminada** (todas jugadas): por defecto la última jornada y ningún aviso de próximo partido. Test en Task 1 y Task 5.
2. **`?jornada=99` o `?jornada=abc`**: jornada por defecto, sin pantalla en blanco. Test en Task 5.
3. **Jornada en la que descansas**: "Descansas esta jornada" encima de los demás partidos. Test en Task 5.
4. **Admin que no juega** (sin partido propio): ve los partidos con su acción de Editar, sin bloque "tu partido". Test en Task 5.
5. **Calendario sin generar o sin jornadas**: mismos estados vacíos que en escritorio y sin tira de chips. Test en Task 5.

---

### Task 1: Rama y `scheduleView`

**Files:**
- Create: `src/utils/scheduleView.ts`, `src/utils/scheduleView.test.ts`

**Interfaces:**
- Produces:
  - `export function defaultJornada(jornadas: JornadaDto[]): number | null`: `roundNumber` de la jornada `'current'` según `jornadaStates`; si no hay (temporada terminada), la última; sin jornadas, `null`.
  - `export function resolveJornada(jornadas: JornadaDto[], requested: string | null): number | null`: el número pedido si es un entero que existe; si no, `defaultJornada`.
  - `export function mineFirst(matches: MatchDto[], username: string | null): { mine: MatchDto | null; others: MatchDto[] }`.

- [ ] **Step 1: Rama.** `git switch feature/movil-equipos; git pull; git switch -c feature/movil-calendario`.
- [ ] **Step 2: Tests que fallan** (fixtures `played` / `pending` como en `src/utils/teamsSummary.test.ts`)
  - `defaultJornada`: con J1 jugada y J2 pendiente → `2`; todas jugadas (3 jornadas) → `3`; `[]` → `null`.
  - `resolveJornada`: `'1'` → `1`; `'99'`, `'abc'`, `null` → la de por defecto.
  - `mineFirst`: con `pending('brock','ash')` entre otros dos → `mine` es ese y `others` los otros dos en su orden; sin partido de `ash` → `mine` `null` y `others` todos; `username` `null` → igual que sin partido.
- [ ] **Step 3: Ejecutar** → FAIL.
- [ ] **Step 4: Implementar.**
- [ ] **Step 5: Verde** y commit: `feat(calendario): jornada por defecto y tu partido primero`.

---

### Task 2: `ChipTabs`

**Files:**
- Create: `src/components/shell/ChipTabs.tsx`, `ChipTabs.module.css`, `ChipTabs.test.tsx`

**Interfaces:**
- Produces: `ChipTabs<T extends string | number>(props: { label: string; options: { value: T; label: string; ariaLabel: string }[]; value: T; onChange: (value: T) => void; idPrefix: string })`. Mismo patrón que `SegmentedTabs` (`role="tablist"`/`"tab"`, ids `${idPrefix}-tab-${value}`, `aria-controls` `${idPrefix}-panel`, roving tabindex, flechas con vuelta, Inicio/Fin), pero cada chip usa `aria-label={ariaLabel}`, la fila hace scroll horizontal (`overflow-x: auto`, sin barra visible) y la chip activa se centra con `scrollIntoView({ inline: 'center', block: 'nearest' })` al cambiar `value` (opcional en jsdom; `behavior` `auto` con reduced motion, como `LeagueTabs`).

- [ ] **Step 1: Tests que fallan** (opciones `{ value: 1, label: 'J1', ariaLabel: 'Jornada 1, jugada' }`, `2 / 'J2' / 'Jornada 2, actual'`, `3 / 'J3' / 'Jornada 3'`)
  - `tablist` con nombre; tabs con nombres `'Jornada 1, jugada'`, `'Jornada 2, actual'`, `'Jornada 3'` y texto visible `J1`...; la seleccionada con `aria-selected="true"` y `tabIndex 0`.
  - clic en `Jornada 3` → `onChange(3)`.
  - `ArrowLeft` desde la primera → `onChange(3)` y foco en ella; `Home` → `onChange(1)`.
- [ ] **Step 2: Ejecutar** → FAIL.
- [ ] **Step 3: Implementar.** Chips de 36px de alto, radio 999px, borde `var(--border)`; activa con `var(--accent-dim)` y texto `var(--accent)`.
- [ ] **Step 4: Verde** y commit: `feat(movil): tira de chips con scroll`.

---

### Task 3: `JornadaMatches`

**Files:**
- Create: `src/components/schedule/JornadaMatches.tsx`
- Modify: `src/components/schedule/JornadaCard.tsx` (usa `JornadaMatches`; mismo markup)

**Interfaces:**
- Produces: `JornadaMatches(props: { id?: string; matches: MatchDto[]; jornada: JornadaDto; username: string | null; isAdmin: boolean; onRecord; onEdit; onPlay; onLineup; onImport: (match: MatchDto) => void; spriteIds: Map<string, number>; emptyText?: string })`: el `<div className="jornada-matches">` actual con `MatchRow` por partido (`lineupOpensAt` de `jornada`). `matches` separado de `jornada` para poder pasar el orden de la vista móvil.

- [ ] **Step 1: Extraer.** `JornadaCard` pasa `jornada.matches` y su `id`.
- [ ] **Step 2: Tests actuales sin tocarlos**: `rtk proxy npx vitest run src/pages/SchedulePage.test.tsx src/components/schedule` → todos en verde; `tsc` limpio.
- [ ] **Step 3: Commit**: `refactor(calendario): lista de partidos de una jornada aparte`.

---

### Task 4: Extraer `useSchedulePage`, `ScheduleModals` y `ScheduleDesktopView`

**Files:**
- Create: `src/pages/schedule/useSchedulePage.ts`, `src/pages/schedule/ScheduleModals.tsx`, `src/pages/schedule/ScheduleDesktopView.tsx`
- Modify: `src/pages/SchedulePage.tsx` (unas 15 líneas, como `TeamsPage`)

**Interfaces:**
- Produces: `useSchedulePage()` y `export type SchedulePageModel = ReturnType<typeof useSchedulePage>`, con todo lo que usan hoy el JSX y los modales (incluidos `jornadas`, `states`, `currentIndex`, `next`, `jornadaLabel`, `expanded`, `toggleJornada`, `currentRef`, los `open*`/`set*Match`, `spriteIds`, `username`, `isAdmin`, `myCoins`, `isLoading`, `schedule`). `ScheduleModals({ model })` con los modales actuales y `ScheduleDesktopView({ model })` con el `<main>` actual, ambos sin cambios de markup. Componentes locales que hoy vivan en `SchedulePage.tsx` (p. ej. `ScoreFields`) se mueven al fichero que los usa.
- Mismo patrón que `pages/teams/` (ver `useTeamsPage`, `TeamsModals`, `TeamsDesktopView`): las vistas desestructuran del `model` solo lo que usan.

- [ ] **Step 1: Mover** el código.
- [ ] **Step 2: Tipos y lint** limpios.
- [ ] **Step 3: Tests actuales sin tocarlos**: `rtk proxy npx vitest run src/pages/SchedulePage.test.tsx src/components/schedule` → todos en verde.
- [ ] **Step 4: Commit**: `refactor(calendario): logica en useSchedulePage y vista de escritorio aparte`.

---

### Task 5: `ScheduleMobileView` y elección de vista

**Files:**
- Create: `src/pages/schedule/ScheduleMobileView.tsx`, `ScheduleMobileView.module.css`, `src/pages/SchedulePage.mobile.test.tsx`
- Modify: `src/pages/SchedulePage.tsx`

**Interfaces:**
- Consumes: `SchedulePageModel`, `ScheduleModals`, `ChipTabs`, `JornadaMatches`, `resolveJornada`, `mineFirst`, `nextMatchFor` (vía `model.next`), `formatDay`.

- [ ] **Step 1: Tests que fallan** (`SchedulePage.mobile.test.tsx`: mismos mocks que `SchedulePage.test.tsx` más `useLayoutMode` → `'mobile'`; `createMemoryRouter` con la ruta `/leagues/:leagueId/schedule`)
  - con J1 jugada y J2 actual (`pending('misty','ash')` y `pending('brock','may')`): `tablist` "Jornadas" con tabs `Jornada 1, jugada` y `Jornada 2, actual`; la 2 seleccionada; el primer partido del panel es el de `ash` (marcado con el título "Tu partido") y después `brock vs may`; ningún partido de J1 visible.
  - pulsar `Jornada 1, jugada` → `?jornada=1` con `historyAction` `'REPLACE'` y se ven los partidos de J1.
  - `?jornada=99` y `?jornada=abc` → J2 seleccionada.
  - J2 sin partido de `ash` y J3 con `pending('ash','gary')`, en J2: "Descansas esta jornada" y el aviso "Tu próximo partido: J3 vs gary" con botón "Ver"; pulsarlo selecciona J3 (`?jornada=3`) y el aviso desaparece.
  - en la jornada de tu próximo partido no hay aviso.
  - temporada terminada: seleccionada la última jornada y sin aviso.
  - admin sin partido propio (`username` que no juega y es admin): sin "Tu partido" ni "Descansas"; botón Editar en un partido jugado.
  - sin calendario (`getSchedule` → `null`): el texto "El calendario se generará automáticamente al completar el draft." y sin `tablist`.
  - pulsar "Resultado" en tu partido abre el diálogo "¿Quién ganó?".
- [ ] **Step 2: Ejecutar** → FAIL.
- [ ] **Step 3: Implementar**
  - `SchedulePage`: `<ScheduleModals model={model} />` y `useLayoutMode() === 'mobile' ? <ScheduleMobileView …/> : <ScheduleDesktopView …/>`.
  - `ScheduleMobileView`: `<main className="page-content">`, `h1` "Calendario" en `sr-only`; estados de carga y vacíos iguales que escritorio; con jornadas: `ChipTabs` (`label` "Jornadas", `idPrefix` "jornadas", opciones `J{n}` con `ariaLabel` `Jornada {n}` + `, jugada` / `, actual` según `states`), aviso de próximo partido si `model.next` existe y su `roundNumber` ≠ seleccionada (`Tu próximo partido: J{n} vs {rival}` y botón "Ver" que cambia `?jornada=`), y el panel (`role="tabpanel"`, `id` "jornadas-panel", `aria-labelledby` la chip activa) con: fecha (`formatDay(startDate)`) y etiqueta de vuelta (`model.jornadaLabel`), bloque "Tu partido" (título `h2` y `JornadaMatches` con `[mine]`) o "Descansas esta jornada" si el usuario está en el calendario y no juega esa jornada, y `JornadaMatches` con `others` (`emptyText` "Sin partidos esta jornada.").
  - "Está en el calendario" = aparece como `player1`/`player2` en alguna jornada; si no (admin que no juega), ni "Tu partido" ni "Descansas".
- [ ] **Step 4: Verde**: `rtk proxy npx vitest run src/pages/SchedulePage.mobile.test.tsx src/pages/SchedulePage.test.tsx src/components/schedule src/utils/scheduleView.test.ts` y commit: `feat(calendario): vista movil con selector de jornada`.

---

### Task 6: Verificación, documentación y PR

- [ ] **Step 1: Suite completa**: `npm run lint; npm test; npm run build` → verde.
- [ ] **Step 2: Navegador** (backend local en marcha; usuario `visualtest` con partido pendiente en la J1 de la liga local `6abbde0c7c96377510ad4005`). A 375 px: tira de chips con la jornada actual seleccionada; "Tu partido" primero; cambiar de jornada no añade historial (`history.length` igual); "Resultado" abre "¿Quién ganó?" (cancelar, sin guardar); sin scroll horizontal de la página (`scrollWidth <= innerWidth`). A 1280 px (`resize_window` 1280x900): Calendario igual que antes (lista de jornadas, sin `tablist`).
- [ ] **Step 3: Vault** (`git pull`, commit a `main`, push): `50 Features/Diseño móvil de app.md` (Calendario hecho, con PR y decisiones) y `40 Frontend/Estructura frontend.md` (`pages/schedule/`, `JornadaMatches`, `ChipTabs`, `scheduleView`).
- [ ] **Step 4: Commit del plan, push y PR** con `base: feature/movil-equipos`, título `Diseño móvil (3/4): Calendario`. Cuerpo: qué cambia, cómo se verificó, apilado sobre #142, #141 y #140. Terminar con `🤖 Generated with [Claude Code](https://claude.com/claude-code)`. Número del PR a la nota del vault.
