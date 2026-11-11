# Diseño móvil de app: subproyecto 3, pantalla Equipos Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** En móvil, Equipos muestra arriba una card de resumen (jornada, tu partido, último resultado, robos e intercambios con su cierre, monedas e Intercambios) y debajo tres sub-pestañas: Mi equipo · Rivales · Banquillo. El escritorio no cambia.

**Architecture:** La lógica de `TeamsPage` (8 queries, 6 mutaciones, estado de modales y filtros) pasa a `useTeamsPage`. Los modales se renderizan una vez en `TeamsModals`. `TeamsPage` elige con `useLayoutMode()` entre `TeamsDesktopView` (el JSX actual movido tal cual) y `TeamsMobileView`. La sub-pestaña vive en la URL (`?vista=`).

**Tech Stack:** React 19, react-router-dom 7, TanStack Query 5, Vitest + Testing Library. Reutiliza `seasonSummary` (`utils/home`), `windowStatus` (`utils/market`), `myResultText` (`utils/schedule`) y `useNow`.

**Spec:** sin design doc (preferencia del usuario). Diseño aprobado en conversación el 2026-11-10 con bocetos: estructura A (card + sub-pestañas), card completa, enfoque "hook + dos vistas". Contexto: vault `50 Features/Diseño móvil de app.md`.

## Global Constraints

- Rama `feature/movil-equipos` desde `feature/movil-shell` actualizada. PR con `base: feature/movil-shell` (stack; se mergea todo junto). API REST de GitHub con `$env:GITHUB_PERSONAL_ACCESS_TOKEN`, sin `gh`, sin imprimir el token.
- Commits con `git commit -F` (UTF-8 sin BOM), en español, terminando en `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Escritorio idéntico: los tests actuales de `src/pages/TeamsPage.test.tsx` deben pasar **sin modificarlos** (en jsdom `useLayoutMode` da `'desktop'`).
- Componentes nuevos con CSS Modules. Textos según el glosario (`src/glossary.test.ts`): "intercambios", "banquillo", "robos", nunca "trade"/"swap"/"banca".
- Ventanas de mercado: solo `stealWindowOpen` / `swapWindowOpen` y los textos de `windowStatus` (ADR-003); no recalcular fechas.
- Sub-pestaña en la URL: `?vista=equipo|rivales|banquillo`, cambios con `replace: true`. Valor desconocido o ausente = vista por defecto.
- Tests con `rtk proxy npx vitest run <ruta>`; tipos con `./node_modules/.bin/tsc -p tsconfig.app.json --noEmit`.

## Review Focus

1. **Sin equipo propio** (miembro que no está en el draft): por defecto Rivales, y la pestaña "Mi equipo" no aparece. Test en Task 5.
2. **Draft sin completar**: ni card ni sub-pestañas; se ven los equipos como hoy. Test en Task 5.
3. **`?vista=` con un valor inventado** (`?vista=xyz`): vista por defecto, sin pantalla en blanco. Test en Task 5.
4. **Temporada terminada** (todas las jornadas jugadas): la card dice "Temporada terminada" y las ventanas "cerrados · temporada terminada", sin partido. Test en Task 1.
5. **Llegar con `openTrades`** (desde "Tu cuenta" o el aviso) en móvil abre el modal de Intercambios. Test en Task 5.

---

### Task 1: Rama y `teamsSummary`

**Files:**
- Create: `src/utils/teamsSummary.ts`, `src/utils/teamsSummary.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export interface TeamsSummary {
    roundNumber: number | null;      // jornada en juego; null con la temporada terminada
    headline: string;                // 'Tu partido: vs misty' | 'Descansas esta jornada' | 'Ya has jugado esta jornada' | 'Temporada terminada'
    opponent: string | null;         // rival del partido de la jornada en juego (para enlazar al Calendario)
    nextLine: string | null;         // 'Próximo: brock (jornada 4)' cuando el próximo partido no es de la jornada en juego
    last: string | null;             // myResultText del último jugado: 'Ganaste a may 6–0'
    steal: WindowStatus;             // windowStatus('steal', …)
    swap: WindowStatus;              // windowStatus('swap', …)
  }
  export function teamsSummary(schedule: ScheduleResponse | undefined, username: string, now: Date): TeamsSummary | null
  ```

- [ ] **Step 1: Rama.** `git switch feature/movil-shell; git pull; git switch -c feature/movil-equipos`.
- [ ] **Step 2: Tests que fallan** (fixtures como en `src/pages/HomePage.test.tsx`: `played`, `pending`, `schedule`).
  - sin calendario devuelve `null`.
  - jornada 2 con `pending('jessie','ash')` y jornada 1 `played('ash','may','ash')` (marcador 6–0): `roundNumber` 2, `headline` `'Tu partido: vs jessie'`, `opponent` `'jessie'`, `nextLine` `null`, `last` `'Ganaste a may 6–0'`.
  - jornada en juego sin partido tuyo y el siguiente en la jornada 3: `headline` `'Descansas esta jornada'`, `opponent` `null`, `nextLine` `'Próximo: <rival> (jornada 3)'`.
  - ya jugaste la jornada en juego (otros pendientes): `headline` `'Ya has jugado esta jornada'`.
  - todas jugadas: `roundNumber` `null`, `headline` `'Temporada terminada'`, `steal.text` `'cerrados · temporada terminada'`.
  - `stealWindowOpen: true` con `stealDeadline` a 5 h de `now`: `steal` = `{ open: true, text: 'abiertos · cierran en 5 h' }`.
- [ ] **Step 3: Ejecutar** → FAIL (módulo inexistente).
- [ ] **Step 4: Implementar** sobre `seasonSummary(schedule, username)` y `windowStatus`, con la misma regla de "partido de la jornada en juego" que `HomeLeagueCard` (`next.roundNumber === current.roundNumber`).
- [ ] **Step 5: Verde** y commit: `feat(equipos): resumen de la jornada y del mercado`.

---

### Task 2: `SegmentedTabs`

**Files:**
- Create: `src/components/shell/SegmentedTabs.tsx`, `SegmentedTabs.module.css`, `SegmentedTabs.test.tsx`

**Interfaces:**
- Produces: `SegmentedTabs<T extends string>(props: { label: string; options: { value: T; label: string }[]; value: T; onChange: (value: T) => void; idPrefix: string })`. Cada botón tiene `role="tab"`, `id={`${idPrefix}-tab-${value}`}`, `aria-controls={`${idPrefix}-panel`}` y `aria-selected`; el contenedor `role="tablist"` con `aria-label={label}`. El panel lo pinta quien lo usa con `role="tabpanel"`, `id={`${idPrefix}-panel`}` y `aria-labelledby` de la pestaña activa.

- [ ] **Step 1: Tests que fallan**
  - pinta un `tab` por opción dentro de un `tablist` con nombre; la actual con `aria-selected="true"` y `tabIndex=0`, el resto `-1`.
  - clic en otra llama a `onChange` con su `value`.
  - con el foco en una pestaña, `ArrowRight` / `ArrowLeft` llaman a `onChange` con la siguiente / anterior (con vuelta al principio y al final) y mueven el foco; `Home` / `End` a la primera / última.
- [ ] **Step 2: Ejecutar** → FAIL.
- [ ] **Step 3: Implementar.** Estilo: fila de botones a todo el ancho, borde `var(--border)`, radio 10px, activa con `var(--accent-dim)` y texto `var(--accent)`, 40px de alto mínimo.
- [ ] **Step 4: Verde** y commit: `feat(movil): control de sub-pestañas`.

---

### Task 3: `TeamsSummaryCard`

**Files:**
- Create: `src/components/teams/TeamsSummaryCard.tsx`, `TeamsSummaryCard.module.css`, `TeamsSummaryCard.test.tsx`

**Interfaces:**
- Consumes: `TeamsSummary` (Task 1), `CoinBadge` existente.
- Produces: `TeamsSummaryCard(props: { summary: TeamsSummary; coins: number | undefined; pendingTrades: number; onOpenTrades: () => void })`.

- [ ] **Step 1: Tests que fallan** (dentro de `MemoryRouter`)
  - muestra `Jornada 2`, el `headline`, `Último: Ganaste a may 6–0` y `nextLine` si lo hay.
  - con `opponent`, el titular es un enlace a `schedule` (relativo, como las pestañas de la liga).
  - muestra "Robos" con `steal.text` y "Intercambios y banquillo" con `swap.text`, cada uno marcado abierto o cerrado (`data-open`), con el mismo texto de etiqueta que `MarketStatus`.
  - botón "Intercambios": con `pendingTrades` 2 su nombre accesible es `'Intercambios, 2 pendientes'` y llama a `onOpenTrades`; con 0 no hay número.
  - con `coins` 120 muestra el `CoinBadge`; con `undefined` no.
- [ ] **Step 2: Ejecutar** → FAIL.
- [ ] **Step 3: Implementar** según el boceto aprobado: cabecera (jornada a la izquierda, último resultado a la derecha), titular grande, dos filas de ventana (punto verde y fondo `--success-bg` si abierta, gris si cerrada; texto a la derecha) y pie con monedas y botón "Intercambios" (número sobre fondo `var(--danger)`). `roundNumber` `null` → sin "Jornada".
- [ ] **Step 4: Verde** y commit: `feat(equipos): card de resumen`.

---

### Task 4: Extraer `useTeamsPage`, `TeamsModals` y `TeamsDesktopView`

**Files:**
- Create: `src/pages/teams/useTeamsPage.ts`, `src/pages/teams/TeamsModals.tsx`, `src/pages/teams/TeamsDesktopView.tsx`
- Modify: `src/pages/TeamsPage.tsx` (queda en unas 20 líneas)

**Interfaces:**
- Produces:
  - `useTeamsPage(): TeamsPageModel`, con `leagueId` de `useParams`. `TeamsPageModel` = todo lo que hoy usa el JSX de `TeamsPage`: datos derivados (`draft`, `isLoading`, `isDraftCompleted`, `teams`, `myTeam`, `filteredRivals`, `bench`, `schedule`, `myCoins`, `myBalance`, `leagueSettings`, `maxTeamSize`, `tierByName`, `entryByName`, `stealWindowOpen`, `swapWindowClosed`, `pendingIncomingCount`, `filterActive`, `copiedTeam`, `ownTeamCollapsed`, filtros), funciones (`effectiveStealPrice`, `exportTeamToShowdown`, `showDetail`, `handleBenchCardClick`, setters de filtros y de modales) y `modals: TeamsModalsProps`.
  - `TeamsModals(props: TeamsModalsProps)`: los 8 bloques de modal actuales (`BenchActionModal`, `SwapModal`, `RivalActionModal`, `StealModal`, `SetPriceModal`, `ReleaseModal`, `TradesModal`, `ProposeTradeModal`, `PokemonDetailModal`) tal cual.
  - `TeamsDesktopView({ model }: { model: TeamsPageModel })`: el `<main className="page-content">` actual, sin cambios de markup.
  - `TeamsPage`: `const model = useTeamsPage();` y `<><TeamsModals {...model.modals} /><TeamsDesktopView model={model} /></>`.
- Movimiento sin cambios de comportamiento: mismos nombres, mismas query keys, mismo efecto de `openTrades`. Si `useTeamsPage` pasa de ~300 líneas, dejar en su sitio las funciones puras que ya existan en `utils/`.

- [ ] **Step 1: Mover** el código según la lista.
- [ ] **Step 2: Tipos y lint**: `tsc` y `npm run lint` → sin errores.
- [ ] **Step 3: Tests actuales sin tocarlos**: `rtk proxy npx vitest run src/pages/TeamsPage.test.tsx src/components/teams` → los mismos que antes, todos en verde.
- [ ] **Step 4: Commit**: `refactor(equipos): logica en useTeamsPage y vista de escritorio aparte`.

---

### Task 5: `TeamsMobileView` y elección de vista

**Files:**
- Create: `src/pages/teams/TeamsMobileView.tsx`, `TeamsMobileView.module.css`, `src/pages/TeamsPage.mobile.test.tsx`
- Modify: `src/pages/TeamsPage.tsx`
- Create: `src/components/teams/OwnTeamGrid.tsx` (la rejilla de `PokemonCard` que hoy está dentro de `OwnTeamPanel`)
- Modify: `src/components/teams/OwnTeamPanel.tsx` (usa `OwnTeamGrid`; mismo markup)

**Interfaces:**
- Consumes: `TeamsPageModel`, `TeamsModals`, `teamsSummary`, `TeamsSummaryCard`, `SegmentedTabs`, `useNow`.
- Produces: `TeamsMobileView({ model }: { model: TeamsPageModel })`; `OwnTeamGrid(props)` con las props de rejilla de `OwnTeamPanel` (`team`, `tierByName`, `isDraftCompleted`, `stealWindowOpen`, `swapWindowClosed`, `effectiveStealPrice`, `onRaisePrice`, `onRelease`, `onInfo`).

- [ ] **Step 1: Tests que fallan** (`TeamsPage.mobile.test.tsx`: mismos mocks que `TeamsPage.test.tsx` más `useLayoutMode` → `'mobile'`; router con `initialEntries`)
  - draft completado: card con el titular y "Robos"; `tablist` "Secciones de Equipos" con Mi equipo, Rivales y Banquillo; Mi equipo seleccionada y tus Pokémon visibles; ningún rival visible.
  - pulsar Rivales: `?vista=rivales` en la URL (`router.state.location.search`), los rivales y el buscador visibles; `router.state.historyAction` es `'REPLACE'`.
  - entrar con `?vista=banquillo` muestra el banquillo.
  - entrar con `?vista=xyz` muestra Mi equipo.
  - usuario sin equipo en el draft: no hay pestaña Mi equipo y la vista es Rivales.
  - draft en curso (`IN_PROGRESS`): ni card ni `tablist`; los equipos se ven como hoy.
  - entrar con `state: { openTrades: true }` abre el diálogo de Intercambios.
  - pulsar un Pokémon rival con la ventana de robos abierta abre el modal de acción (igual que en escritorio).
- [ ] **Step 2: Ejecutar** → FAIL.
- [ ] **Step 3: Implementar**
  - `TeamsPage`: `useLayoutMode() === 'mobile' ? <TeamsMobileView model={model} /> : <TeamsDesktopView model={model} />`, con `TeamsModals` fuera de ambas.
  - `TeamsMobileView`: `<main className="page-content">` con `h1` "Equipos" visualmente oculto (`sr-only`; la app bar ya dice la liga), `TeamsSummaryCard` (si `isDraftCompleted` y `teamsSummary(...)` no es `null`; `now` de `useNow()`), `SegmentedTabs` (`label` "Secciones de Equipos", `idPrefix` "equipos") y el panel de la vista. Sin draft completado: el mismo contenido que escritorio (rejillas de equipos), sin card ni pestañas.
  - Vista `equipo`: cabecera corta (`n/max` y botón Showdown) y `OwnTeamGrid`. Vista `rivales`: `TeamFilterBar` + `RivalTeamsList` con las mismas props que en escritorio. Vista `banquillo`: `BenchSection` con las mismas props.
  - `vista` con `useSearchParams`; `setSearchParams({ vista }, { replace: true })`.
- [ ] **Step 4: Verde**: `rtk proxy npx vitest run src/pages/TeamsPage.mobile.test.tsx src/pages/TeamsPage.test.tsx src/components/teams` y commit: `feat(equipos): vista movil con resumen y sub-pestañas`.

---

### Task 6: Verificación, documentación y PR

- [ ] **Step 1: Suite completa**: `npm run lint; npm test; npm run build` → verde.
- [ ] **Step 2: Navegador** (backend local: Docker con Mongo y Redis, jar de `pokefantasy/src/boot/target`, usuario `visualtest` en la liga local `6abbde0c7c96377510ad4005`; `preview_start` `pokefantasy-web-dev`). A 375 px: card con datos reales; las tres sub-pestañas; atrás del navegador no recorre las sub-pestañas; abrir un Pokémon rival y uno del banquillo abre su modal; "Intercambios" abre el modal; sin scroll horizontal (`scrollWidth <= innerWidth`) y sin scroll anidado en Mi equipo. A 1024 px: Equipos igual que en `feature/movil-shell` (panel de tu equipo fijo, filtros, rivales y banquillo en una columna).
- [ ] **Step 3: Vault** (`git pull`, commit directo a `main`, push): `50 Features/Diseño móvil de app.md` (subproyecto 3: Equipos hecha, con PR y lo decidido: card completa y sub-pestañas en la URL); `40 Frontend/Estructura frontend.md` (`pages/teams/` con `useTeamsPage`, `TeamsModals` y las dos vistas; `TeamsSummaryCard`, `OwnTeamGrid`; `SegmentedTabs` en `components/shell/`; `teamsSummary` en utils).
- [ ] **Step 4: Commit del plan, push y PR** con `base: feature/movil-shell`, título `Diseño móvil (3/4): Equipos`. Cuerpo: qué cambia, cómo se verificó, que va apilado sobre #141 y #140. Terminar con `🤖 Generated with [Claude Code](https://claude.com/claude-code)`. Añadir el número del PR a la nota del vault.
