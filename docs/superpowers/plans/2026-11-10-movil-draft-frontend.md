# Diseño móvil de app: subproyecto 3, pantalla Draft Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** En móvil, durante el draft, una barra de turno fija (quién juega, ronda, reloj, tus monedas) y dos sub-pestañas: Elegir (la rejilla de siempre) y Tablero (por jugador, con chips). El escritorio no cambia.

**Architecture:** Igual que Equipos y Calendario: la lógica de `DraftPage` pasa a `pages/draft/useDraftPage`, los modales a `DraftModals`, el JSX actual a `DraftDesktopView`, y se añade `DraftMobileView`. `DraftPage` elige con `useLayoutMode()`. El tablero por jugador sale de `buildDraftBoard` (ya existe) con una función pura nueva. La sub-pestaña vive en la URL (`?vista=`).

**Tech Stack:** React 19, react-router-dom 7, TanStack Query 5, motion 13, Vitest + Testing Library. Reutiliza `SegmentedTabs`, `ChipTabs`, `DraftPoolGrid`, `buildDraftBoard`, `spendingByPlayer`, `TierBadge`, `spriteUrl`, `coinsLabel`.

**Spec:** sin design doc (preferencia del usuario). Diseño aprobado en conversación el 2026-11-10 con bocetos: estructura A (barra de turno fija + Elegir / Tablero) y tablero A (por jugador con chips). Contexto: vault `50 Features/Diseño móvil de app.md`.

## Global Constraints

- Rama `feature/movil-draft` desde `feature/movil-pool` actualizada. PR con `base: feature/movil-pool` (stack; se mergea todo junto). API REST de GitHub con `$env:GITHUB_PERSONAL_ACCESS_TOKEN`, sin `gh`, sin imprimir el token.
- Commits con `git commit -F` (UTF-8 sin BOM), en español, terminando en `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Escritorio idéntico: `src/pages/DraftPage.test.tsx`, `src/components/draft/*.test.tsx` pasan **sin modificarlos**.
- Componentes nuevos con CSS Modules. Textos según el glosario (`src/glossary.test.ts`).
- Sub-pestaña en la URL: `?vista=elegir|tablero`, cambios con `replace: true` conservando otros parámetros (`setParams((prev) => { prev.set(...); return prev; }, { replace: true })`). Valor desconocido = vista por defecto.
- Ediciones de ficheros existentes con la herramienta Edit; el troceo de `DraftPage` con un script `.cjs` escrito en el scratchpad (como `split-schedule.cjs`), nunca con regex dentro de bash.
- Tests con `rtk proxy npx vitest run <ruta>`; tipos con `./node_modules/.bin/tsc -p tsconfig.app.json --noEmit`.

## Review Focus

1. **Te toca mientras estás en Tablero**: la barra lo dice ("Te toca") y su botón "Elegir" te lleva a Elegir. Test en Task 3 y Task 5.
2. **Usuario que no juega el draft** (admin o miembro fuera del orden de turnos): sin "Te quedan", sin chip "Tú", por defecto Tablero. Test en Task 1 y Task 5.
3. **Pokémon que cambió de dueño** tras el draft (robo, intercambio): en el tablero por jugador dice "ahora en {dueño}". Test en Task 1.
4. **Draft terminado o cancelado**: sin barra de turno; tablero por jugador directamente (si hay historial). Test en Task 5.
5. **Tu draft ha terminado** (equipo completo o sin dinero) con el draft aún en curso: la barra lo dice y la vista por defecto es Tablero. Test en Task 3 y Task 5.

---

### Task 1: Rama y `draftPlayerBoard`

**Files:**
- Create: `src/utils/draftPlayerBoard.ts`, `src/utils/draftPlayerBoard.test.ts`

**Interfaces:**
- Consumes: `DraftBoardData`, `BoardCell` (`utils/draftBoard`).
- Produces:
  - `export interface PlayerRound { round: number; cell: BoardCell }`
  - `export function playerColumn(board: DraftBoardData, username: string): PlayerRound[]`: para cada ronda de `board.rounds`, la casilla de ese jugador.
  - `export function playerOrder(players: string[], me: string | null): string[]`: `me` primero si está en `players`; el resto en su orden.

- [ ] **Step 1: Rama.** `git switch feature/movil-pool; git pull; git switch -c feature/movil-draft`.
- [ ] **Step 2: Tests que fallan** (tablero construido con `buildDraftBoard` sobre un historial de 2 jugadores y 3 rondas, `current` en la ronda 2 de `misty`, `currentPicks` donde el pick de ronda 1 de `ash` ahora es de `misty`)
  - `playerColumn(board, 'ash')` tiene 3 rondas; ronda 1 con `pick.pokemonName` y `currentOwner === 'misty'`; ronda 3 con `pick === null` e `isCurrent === false`.
  - `playerColumn(board, 'misty')`: ronda 2 con `isCurrent === true`.
  - `playerOrder(['brock','ash','misty'], 'ash')` → `['ash','brock','misty']`; con `'oak'` (no juega) → igual que la entrada; con `null` → igual.
- [ ] **Step 3: Ejecutar** → FAIL. **Step 4: Implementar.** **Step 5: Verde** y commit: `feat(draft): columna de un jugador en el tablero`.

---

### Task 2: Extraer `useDraftPage`, `DraftModals` y `DraftDesktopView`

**Files:**
- Create: `src/pages/draft/useDraftPage.ts`, `src/pages/draft/DraftModals.tsx`, `src/pages/draft/DraftDesktopView.tsx`
- Modify: `src/pages/DraftPage.tsx` (unas 15 líneas)

**Interfaces:**
- Produces: `useDraftPage()` y `export type DraftPageModel = ReturnType<typeof useDraftPage>` con todo lo que usan el JSX y los modales (incluidos `draft`, `isLoading`, `pool`, `availablePool`, `config`, `myRemaining`, `isMyTurn`, `iAmOut`, `isPlayer`, `draftInProgress`, `history`, `board`, `tierByName`, `entryByName`, `spending`, `secondsLeft`, `favorites`, `toggleFavorite`, `picking`, `setPendingPick`, `setDetailEntry`, `isAdmin`, `setShowCancelModal`, `statusLabel`, `statusClass`, `totalRounds`, `myTeamSize`, `username`, `leagueId`). `DraftModals({ model })` con el modal de cancelar, el de confirmar el pick y la ficha (`PokemonDetailModal`). `DraftDesktopView({ model })` con el `<main>` actual, sin cambios de markup.
- Uniones literales que se ensanchen al devolverse (como `playStatus` en el Calendario) se tipan explícitamente.

- [ ] **Step 1: Mover** con un script `.cjs` en el scratchpad (patrón de `split-schedule.cjs`: slice por líneas, claves del modelo sacadas de las declaraciones de primer nivel, desestructuración solo de lo usado).
- [ ] **Step 2: Tipos y lint** limpios.
- [ ] **Step 3: Tests actuales sin tocarlos**: `rtk proxy npx vitest run src/pages/DraftPage.test.tsx src/components/draft` → todos verdes.
- [ ] **Step 4: Commit**: `refactor(draft): logica en useDraftPage y vista de escritorio aparte`.

---

### Task 3: `DraftTurnBar`

**Files:**
- Create: `src/components/draft/DraftTurnBar.tsx`, `DraftTurnBar.module.css`, `DraftTurnBar.test.tsx`

**Interfaces:**
- Produces: `DraftTurnBar(props: { currentTurn: string | null; isMyTurn: boolean; iAmOut: boolean; round: number; secondsLeft: number | null; remaining: number | null; onChoose?: () => void })`. `onChoose` presente = se pinta el botón "Elegir" (solo cuando te toca y estás en Tablero; lo decide el que la usa).

- [ ] **Step 1: Tests que fallan**
  - te toca: `role="status"` con "Te toca" y "Ronda 2"; reloj "23 s"; "Te quedan 300" (con `coinsLabel` si da otro formato, el que dé); `data-mine="true"`.
  - turno de otro: "Turno de misty", sin `data-mine`.
  - `onChoose` presente → botón "Elegir" que lo llama; ausente → sin botón.
  - `iAmOut`: "Tu draft ha terminado", sin reloj de tu turno.
  - `remaining` `null` (no juegas) → sin "Te quedan".
- [ ] **Step 2: Ejecutar** → FAIL.
- [ ] **Step 3: Implementar.** `position: sticky; top: calc(60px + env(safe-area-inset-top)); z-index: 45` (bajo la app bar, sobre el contenido). Fondo `var(--surface)`; con `data-mine` borde y fondo de aviso (`var(--warning-border)`, `var(--warning-bg)`). Reloj: el mismo latido que hoy (`motion.span` que pulsa por debajo de 10 s, en `var(--danger)`), sin animación con reduced motion; extraer ese bloque de `DraftDesktopView` a un componente `TurnClock({ secondsLeft })` en `components/draft/TurnClock.tsx` y usarlo en los dos sitios (el escritorio no cambia de markup).
- [ ] **Step 4: Verde** (`src/components/draft` y `src/pages/DraftPage.test.tsx`) y commit: `feat(draft): barra de turno para movil`.

---

### Task 4: `DraftPlayerBoard`

**Files:**
- Create: `src/components/draft/DraftPlayerBoard.tsx`, `DraftPlayerBoard.module.css`, `DraftPlayerBoard.test.tsx`

**Interfaces:**
- Consumes: `playerColumn`, `playerOrder` (Task 1), `ChipTabs`, `SpendingSummary` (`utils/draftBudget`).
- Produces: `DraftPlayerBoard(props: { board: DraftBoardData; me: string | null; tierByName: Map<string, Tier | null | undefined>; budgets?: Record<string, number> | null; spending?: Map<string, SpendingSummary> | null; onSelect: (pokemonName: string) => void })`. Estado interno del jugador elegido (por defecto `me` si juega; si no, el primero).

- [ ] **Step 1: Tests que fallan**
  - `tablist` "Jugadores" con chips en `playerOrder` (la tuya con texto "Tú" y `ariaLabel` "Tú, ash"; las demás con el nombre; la del turno con `ariaLabel` que acaba en ", eligiendo").
  - por defecto, tus rondas: una fila por ronda con "R1" y el nombre del Pokémon capitalizado, su `TierBadge` y el precio con `coinsLabel`; ronda sin pick "pendiente"; la del turno "eligiendo".
  - pulsar la chip de `misty` muestra sus rondas.
  - con `budgets`: "Le quedan 260" del jugador elegido (para ti, "Te quedan").
  - un pick con `currentOwner` muestra "ahora en misty".
  - pulsar una fila con pick llama a `onSelect(pokemonName)`.
  - `me` que no juega: sin chip "Tú"; seleccionado el primero.
- [ ] **Step 2: Ejecutar** → FAIL. **Step 3: Implementar** (panel con `role="tabpanel"`, `id` `jugadores-panel`, `aria-labelledby` la chip activa; filas como botones si hay pick).
- [ ] **Step 4: Verde** y commit: `feat(draft): tablero por jugador para movil`.

---

### Task 5: `DraftMobileView` y elección de vista

**Files:**
- Create: `src/pages/draft/DraftMobileView.tsx`, `DraftMobileView.module.css`, `src/pages/DraftPage.mobile.test.tsx`
- Modify: `src/pages/DraftPage.tsx`

**Interfaces:**
- Consumes: `DraftPageModel`, `DraftModals`, `DraftTurnBar`, `DraftPlayerBoard`, `SegmentedTabs`, `DraftPoolGrid`.

- [ ] **Step 1: Tests que fallan** (`DraftPage.mobile.test.tsx`: mismos mocks que `DraftPage.test.tsx` más `useLayoutMode` → `'mobile'`; `createMemoryRouter` con `/leagues/:leagueId/draft`)
  - draft en curso y te toca: barra "Te toca"; `tablist` "Secciones del draft" con Elegir y Tablero; Elegir seleccionada; la rejilla visible; pulsar un Pokémon abre el diálogo de confirmación (el mismo `alertdialog` de hoy).
  - pulsar Tablero: `?vista=tablero`, `historyAction` `'REPLACE'`, se ve el `tablist` "Jugadores"; la barra muestra "Elegir" y pulsarlo vuelve a `?vista=elegir`.
  - turno de otro: barra "Turno de misty"; Elegir por defecto (puedes mirar y marcar favoritos).
  - tu draft terminado (`iAmOut`): barra "Tu draft ha terminado" y Tablero por defecto.
  - no juegas (username fuera de `turnOrder`): Tablero por defecto y sin "Te quedan".
  - draft `COMPLETED` con historial: sin barra ni pestañas `Secciones del draft`; se ve el `tablist` "Jugadores".
  - draft `PENDING`: igual que escritorio (texto de preparación), sin barra ni pestañas.
  - `?vista=xyz` → la vista por defecto.
  - admin con draft en curso: botón "Cancelar draft" al final de la página.
- [ ] **Step 2: Ejecutar** → FAIL.
- [ ] **Step 3: Implementar**
  - `DraftPage`: `<DraftModals model={model} />` y `useLayoutMode() === 'mobile' ? <DraftMobileView …/> : <DraftDesktopView …/>` (mismo orden de render que hoy: vista y luego modales).
  - `DraftMobileView`: `h1` "Draft" en `sr-only`; carga y vacío iguales que escritorio; `PENDING` y `CANCELLED` sin historial → mismo bloque que escritorio para esa fase (reutilizar el JSX de `DraftDesktopView` renderizando `DraftDesktopView` en esos estados, como hace `TeamsMobileView` antes del draft); `IN_PROGRESS` → `DraftTurnBar` (con `onChoose` solo si `isMyTurn && !iAmOut && vista === 'tablero'`), `PushPrompt context="draft"`, `SegmentedTabs` y panel; `COMPLETED` o `CANCELLED` con historial → `DraftPlayerBoard` directamente; "Cancelar draft" (admin, en curso) como `btn-danger` al final.
  - Vista por defecto: `elegir` si `isPlayer && !iAmOut`; si no, `tablero`.
- [ ] **Step 4: Verde**: `rtk proxy npx vitest run src/pages/DraftPage.mobile.test.tsx src/pages/DraftPage.test.tsx src/components/draft src/utils/draftPlayerBoard.test.ts` y commit: `feat(draft): vista movil con barra de turno y tablero por jugador`.

---

### Task 6: Verificación con un draft real, documentación y PR

- [ ] **Step 1: Suite completa**: `npm run lint; npm test; npm run build` → verde.
- [ ] **Step 2: Draft de prueba en el backend local** (solo base local; documentar en el ledger): con la API (`http://localhost:8080/v1`, cookie de sesión y cabecera `X-Requested-With: XMLHttpRequest`), crear un segundo usuario de prueba (`visualtest2`, contraseña generada en el scratchpad), una liga "Draft móvil" con `visualtest` como admin, añadir a `visualtest2`, nominar suficientes Pokémon con los dos (los endpoints y el flujo se leen de `src/api/leagues.ts` y `src/api/pokemons.ts`), preparar y empezar el draft con `visualtest` en el primer turno. Si algún paso del backend no es posible por API, crear el estado mínimo en Mongo y anotarlo.
- [ ] **Step 3: Navegador a 375 px** con `visualtest`: barra "Te toca" con reloj; al bajar por la rejilla la barra sigue arriba; elegir un Pokémon (confirmar) y ver que pasa a "Turno de visualtest2"; Tablero: chips "Tú" y "visualtest2 (eligiendo)", tu pick en R1; sin scroll horizontal. A 1280 px: el Draft igual que antes (caja de estadísticas, rejilla y tablero en columna).
- [ ] **Step 4: Vault** (`git pull`, commit a `main`, push): nota de la feature (Draft hecho, con PR y decisiones) y `40 Frontend/Estructura frontend.md` (`pages/draft/`, `DraftTurnBar`, `TurnClock`, `DraftPlayerBoard`, `draftPlayerBoard`).
- [ ] **Step 5: Commit del plan, push y PR** con `base: feature/movil-pool`, título `Diseño móvil (3/4): Draft`, apilado sobre #146. Cuerpo con qué cambia, cómo se verificó (incluido el draft de prueba local). Terminar con `🤖 Generated with [Claude Code](https://claude.com/claude-code)`. Número del PR a la nota del vault.
