# Diseño móvil de app: subproyecto 2 (shell de app) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** En móvil (navegador por debajo de 768 px y siempre en la APK), las páginas protegidas se muestran dentro de un shell de app: app bar arriba, barra inferior de liga por fase, sheets para "Más", cambio de liga y cuenta, y atrás de Android coherente. El escritorio no cambia.

**Architecture:** `LeagueLayout` conserva la carga de datos y elige `DesktopLeagueShell` (el markup actual extraído) o `MobileLeagueShell` según `useLayoutMode()` (subproyecto 1). `PageHeader` también elige: en móvil pinta una `AppBar` simple para las páginas de fuera de la liga. Los componentes nuevos viven en `src/components/shell/` con CSS Modules. Un único listener `backButton` de Capacitor recorre una pila de manejadores (sheets y modales) antes de ir atrás en el historial o minimizar la app.

**Tech Stack:** React 19, react-router-dom 7 (data router), TanStack Query 5, motion 13, `lucide-react` 1.71.0 (nueva; peer `react ^19`), `@capacitor/app` 8.1.0 (`addListener('backButton', ({ canGoBack }) => …)`, `minimizeApp()`), Vitest 4 + Testing Library.

**Spec:** sin design doc (preferencia del usuario). Diseño aprobado en conversación el 2026-11-10 y resumido en el vault: `50 Features/Diseño móvil de app.md` (subproyecto 2) y `70 Decisiones/ADR-021 Estructura del CSS y CSS Modules.md`. Decisiones de este brainstorming:
- Iconos con `lucide-react`.
- "Más" solo con cosas de la liga; el avatar de la app bar abre "Tu cuenta" (contenido actual de `UserDrawer`).
- Shell por layout (no un `AppShell` en `RootLayout`); `Sheet` propio sobre `motion`, no una librería.
- El shell depende del modo (`useLayoutMode`); el contenido de las páginas, del ancho (sus `@media`). Sin atributo `data-layout`.
- Stack: rama sobre `feature/movil-cimientos` (PR #140, sin mergear); se mergea todo junto al final.

## Global Constraints

- Rama `feature/movil-shell` creada desde `feature/movil-cimientos` actualizada. PR con `base: feature/movil-cimientos` en `Pokemons-Fantasy/pokefantasy-web` (API REST con `$env:GITHUB_PERSONAL_ACCESS_TOKEN`, nunca imprimirlo; sin `gh`).
- Commits con `git commit -F <fichero>` (UTF-8 sin BOM), en español, terminando en `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Escritorio (`useLayoutMode() === 'desktop'`) sin cambios visibles: mismos componentes y clases que hoy.
- Componentes nuevos en `src/components/shell/`, estilos en `X.module.css` junto a cada componente. Nada nuevo en `src/styles/` salvo los ajustes de la Task 8.
- Alturas: app bar `60px` + `env(safe-area-inset-top)`; barra inferior `64px` + `env(safe-area-inset-bottom)`.
- Textos en español de España según el glosario (`src/glossary.test.ts` falla con términos vetados: nada de "trade", "swap", "banca", "link"). Usar "intercambios", "banquillo", "Tu cuenta", "Más", "Cambiar de liga".
- Modales y paneles siguen las reglas de `Modal` (rol, `aria-modal`, título por `aria-labelledby`, foco atrapado y devuelto, Escape, `canClose`).
- `import type` para tipos. Tests con `rtk proxy npx vitest run <ruta>`; tipos con `./node_modules/.bin/tsc -p tsconfig.app.json --noEmit`.
- Antes del push: `npm run lint`, `npm test`, `npm run build` (`api:check` falla en local por CRLF; la CI lo valida).

## Review Focus

1. **Atrás de Android con un modal abierto encima de un sheet**: cierra solo el de arriba. Test en Task 2.
2. **Última liga guardada de la que ya no eres miembro** (te expulsaron o se borró): `/` en móvil va a `/leagues`, no a una liga que da error. Test en Task 7.
3. **Configuración con cambios sin guardar y pulsar una pestaña de la barra inferior o atrás**: el `useBlocker` actual sigue bloqueando (son navegaciones del router). Test en Task 6.
4. **Barra de guardar, barra de mover del draft y toasts** quedan por encima de la barra inferior, no tapados. Comprobación en el navegador en Task 8.
5. **Sheet con una acción en curso (`canClose={false}`)**: ni arrastre, ni fondo, ni Escape, ni atrás lo cierran. Test en Task 3.

---

### Task 1: Rama, dependencia y lógica de navegación

**Files:**
- Modify: `package.json`, `package-lock.json` (`lucide-react@1.71.0`)
- Modify: `src/utils/leagueNav.ts`, `src/utils/leagueNav.test.ts`
- Create: `src/utils/lastLeague.ts`, `src/utils/lastLeague.test.ts`

**Interfaces:**
- Produces:
  - `export interface MobileNav { bar: LeagueNavItem[]; more: LeagueNavItem[] }`
  - `export function mobileNav(phase: LeaguePhase, isAdmin: boolean): MobileNav` (sin la entrada "Más", que añade el shell)
  - `export function getLastLeague(): string | null`, `export function setLastLeague(leagueId: string): void` (clave `localStorage` `'pf-last-league'`)

- [ ] **Step 1: Rama y dependencia**

Run: `git switch feature/movil-cimientos; git pull; git switch -c feature/movil-shell; npm install lucide-react@1.71.0`
Expected: `lucide-react` en `dependencies` con `^1.71.0`.

- [ ] **Step 2: Tests que fallan**

En `leagueNav.test.ts`, `describe('mobileNav')`:
- temporada, admin: `bar` = `['teams','schedule','standings','activity']`; `more` = `['draft','config','tiers','members']`.
- temporada, jugador: `more` = `['draft','config','members']`.
- `'draft'` y `'preparing'`: `bar` = `leagueTabs(phase)` (`['draft','pool','members']`); `more` = `['config']`.
- `'setup'` y `'cancelled'`: `bar` = `['members','pool','draft']`; `more` = `['config']`.

`lastLeague.test.ts`:
- `setLastLeague('abc')` y luego `getLastLeague()` devuelve `'abc'`.
- sin nada guardado, `null`.
- si `localStorage.getItem` lanza (`vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error() })`), `getLastLeague()` devuelve `null`; si `setItem` lanza, `setLastLeague` no lanza.

- [ ] **Step 3: Ejecutar y ver que fallan**

Run: `rtk proxy npx vitest run src/utils/leagueNav.test.ts src/utils/lastLeague.test.ts` → FAIL (exports inexistentes).

- [ ] **Step 4: Implementar**

`mobileNav`: en temporada, `bar` = `leagueTabs('season')` sin `DRAFT`, `more` = `[DRAFT, ...leagueMenu('season', isAdmin)]`; fuera de temporada, `bar` = `leagueTabs(phase)`, `more` = `leagueMenu(phase, isAdmin)`. `lastLeague.ts` con `try/catch` alrededor de `localStorage`.

- [ ] **Step 5: Verde y commit**

Run: los mismos tests → PASS. Commit: `feat(movil): mobileNav, ultima liga activa y lucide-react`.

---

### Task 2: Pila del botón atrás de Android

**Files:**
- Create: `src/hooks/useBackButton.ts`, `src/hooks/useBackButton.test.tsx`
- Modify: `src/App.tsx` (`RootLayout` monta `<AndroidBackButton />`)
- Modify: `src/components/Modal.tsx` (registra su cierre)

**Interfaces:**
- Produces:
  - `export function useBackHandler(onBack: (() => void) | undefined): void`: mientras el componente está montado, `onBack` está en la pila. `undefined` (p. ej. `canClose === false`) ocupa su sitio pero no hace nada, para que el de debajo no se cierre.
  - `export function handleBack(canGoBack: boolean, goBack: () => void, minimize: () => void): void`: si la pila no está vacía llama al de arriba (aunque sea `undefined`, en cuyo caso no hace nada); si no, `canGoBack ? goBack() : minimize()`.
  - `export function AndroidBackButton(): null` (en el mismo fichero): solo en nativo (`Capacitor.isNativePlatform()`), `CapApp.addListener('backButton', ({ canGoBack }) => handleBack(canGoBack, () => navigate(-1), () => CapApp.minimizeApp()))`, con baja al desmontar.

- [ ] **Step 1: Tests que fallan** (`@capacitor/app` y `@capacitor/core` mockeados)
- con dos `useBackHandler` montados (A debajo y B encima), `handleBack` llama solo a B; al desmontar B, el siguiente `handleBack` llama a A.
- con el de arriba `undefined`, `handleBack` no llama a A ni a `goBack` ni a `minimize`.
- con la pila vacía: `canGoBack=true` → `goBack`; `canGoBack=false` → `minimize`.
- `AndroidBackButton` en web no registra listener; en nativo registra `'backButton'` y lo quita al desmontar.
- `Modal` montado con `canClose` → `handleBack` llama a su `onClose`; con `canClose={false}` no.

- [ ] **Step 2: Ejecutar** → FAIL.
- [ ] **Step 3: Implementar.** La pila es un array a nivel de módulo de `{ current: (() => void) | undefined }` (ref actualizada en cada render, como `onEscapeRef` de `useFocusTrap`). En `Modal`, `useBackHandler(canClose ? onClose : undefined)`.
- [ ] **Step 4: Verde** (`rtk proxy npx vitest run src/hooks/useBackButton.test.tsx src/components/Modal.test.tsx`) y commit: `feat(movil): boton atras de Android con pila de paneles`.

---

### Task 3: Componente `Sheet`

**Files:**
- Create: `src/components/shell/Sheet.tsx`, `Sheet.module.css`, `Sheet.test.tsx`

**Interfaces:**
- Consumes: `useFocusTrap`, `useBackHandler` (Task 2), `useReducedMotion`.
- Produces: `export default function Sheet(props: { labelledBy: string; onClose: () => void; canClose?: boolean; initialFocusRef?: RefObject<HTMLElement | null>; children: ReactNode }): ReactPortal`.

- [ ] **Step 1: Tests que fallan**
- tiene `role="dialog"`, `aria-modal="true"` y se nombra por `labelledBy`.
- el foco entra al abrir y vuelve al botón que lo abrió al desmontar.
- Escape y clic en el fondo llaman a `onClose`; con `canClose={false}` no.
- `handleBack(false, …)` (Task 2) llama a `onClose`; con `canClose={false}` no.
- mientras está montado, `document.body.style.overflow === 'hidden'`; al desmontar se restaura.

- [ ] **Step 2: Ejecutar** → FAIL.
- [ ] **Step 3: Implementar.** Portal en `document.body`. Panel con `motion.div` que entra desde `y: '100%'` (sin animación con reduced motion), `drag="y"`, `dragConstraints={{ top: 0, bottom: 0 }}`, `dragElastic={{ top: 0, bottom: 0.6 }}`; en `onDragEnd`, si `offset.y > 100` o `velocity.y > 500` y `canClose`, `onClose()`. Asa visual arriba (`aria-hidden`). Fondo con la misma regla que `Modal` (solo cierra si la pulsación empezó en él). Ancho completo, esquinas superiores redondeadas, `max-height: 85dvh` con scroll interno, `padding-bottom: env(safe-area-inset-bottom)`, colores de los tokens (`--surface`, `--border`).
- [ ] **Step 4: Verde** y commit: `feat(movil): componente Sheet`.

---

### Task 4: `AppBar`, `BottomNav` e iconos

**Files:**
- Create: `src/components/shell/AppBar.tsx`, `AppBar.module.css`
- Create: `src/components/shell/BottomNav.tsx`, `BottomNav.module.css`, `BottomNav.test.tsx`
- Create: `src/components/shell/navIcons.ts`

**Interfaces:**
- Produces:
  - `AppBar(props: { left?: ReactNode; title?: ReactNode; right?: ReactNode })`: `<header>` sticky, 60px + safe area top.
  - `export interface BottomNavItem { path: string; label: string; icon: LucideIcon; badge?: number; badgeLabel?: string }`
  - `BottomNav(props: { items: BottomNavItem[]; active: string; onMore: () => void; moreActive: boolean })`: `<nav aria-label="Secciones de la liga" data-bottom-nav>` fija abajo; los `items` son `<Link to={path}>` y el último botón es "Más" (icono `Ellipsis`, `aria-haspopup="dialog"`).
  - `navIcons: Record<string, LucideIcon>`: `teams` → `Users`, `schedule` → `CalendarDays`, `standings` → `Trophy`, `activity` → `Activity`, `draft` → `ListOrdered`, `pool` → `LayoutGrid`, `members` → `UserRound`.

- [ ] **Step 1: Tests que fallan** (`BottomNav.test.tsx`, dentro de un `MemoryRouter`)
- pinta un enlace por item con su texto y `href` relativo, más el botón "Más".
- el item activo tiene `aria-current="page"`; con `moreActive`, el botón "Más" tiene `aria-current="page"`.
- con `badge: 3, badgeLabel: '3 intercambios pendientes'` el enlace incluye ese texto accesible; con `badge: 0` no hay badge.
- pulsar "Más" llama a `onMore`.

- [ ] **Step 2: Ejecutar** → FAIL.
- [ ] **Step 3: Implementar.** Iconos de 22 px y `aria-hidden`; texto de 0.7rem debajo; activo en `var(--accent)`. Badge en `var(--danger)` con el número (más de 9: `9+`) y el `badgeLabel` en `sr-only`.
- [ ] **Step 4: Verde** y commit: `feat(movil): AppBar y barra inferior`.

---

### Task 5: "Tu cuenta" y `PageHeader` en móvil

**Files:**
- Create: `src/components/shell/AccountSheet.tsx`, `AccountSheet.module.css`, `AccountButton.tsx`
- Create: `src/hooks/useSectionTitle.ts`
- Modify: `src/components/DocumentTitle.tsx` (usa `useSectionTitle`)
- Modify: `src/components/PageHeader.tsx`, `src/components/PageHeader.test.tsx`
- Delete: `src/components/UserDrawer.tsx` y sus reglas `.user-drawer*`, `.header-avatar-button`, `.header-mobile` en `src/styles/layout.css` y `src/styles/responsive.css` (dejar `.header-desktop` y `.header-avatar*` si siguen en uso: comprobar con grep antes de borrar)

**Interfaces:**
- Consumes: `Sheet`, `AppBar`, `getLastLeague`, `useLayoutMode`.
- Produces:
  - `useSectionTitle(): string | undefined`: título de la ruta más concreta con `handle.title` (la lógica que hoy está dentro de `DocumentTitle`).
  - `AccountSheet(props: { onClose: () => void })`: mismo contenido y textos que `UserDrawer` (perfil, Mi perfil, Mis ligas, intercambios pendientes por liga con `state={{ openTrades: true }}`, Tus ligas con la actual marcada, `PushToggle`, tema, Cerrar sesión, `AppVersion`). Saca sus datos de las queries `['me']`, `['my-leagues']`, `['my-pending-trades']` (mismas keys y `staleTime` que `PageHeader`), `useTheme` y `authStore`.
  - `AccountButton()`: avatar de 36 px con el punto de intercambios pendientes; `aria-label` "Tu cuenta" o "Tu cuenta, N intercambios pendientes"; abre `AccountSheet`.

- [ ] **Step 1: Tests que fallan** (`PageHeader.test.tsx`, `useLayoutMode` mockeado)
- Migrar los tests actuales del panel (abrir con el avatar, perfil y ligas con la actual marcada, ir a Mi perfil cierra, Escape cierra y devuelve el foco, cerrar sesión, intercambios pendientes en el avatar y por liga) a modo `'mobile'`: el avatar ahora es "Tu cuenta" y abre el sheet.
- en `'mobile'`, con última liga `'L1'` guardada, el enlace "Volver" apunta a `/leagues/L1`; sin última liga, a `/leagues`.
- en `'mobile'`, el título de la app bar es el `handle.title` de la ruta (`'Mi perfil'` en `/profile`).
- en `'desktop'`, se mantienen el logo, el saludo enlazado al perfil, el tema y "Cerrar sesión", y no hay botón "Tu cuenta".

- [ ] **Step 2: Ejecutar** → FAIL.
- [ ] **Step 3: Implementar.** `PageHeader` en `'desktop'` renderiza lo actual sin el botón móvil ni `UserDrawer`; en `'mobile'`, `<AppBar left={<Link aria-label="Volver" …><ChevronLeft/></Link>} title={useSectionTitle()} right={<AccountButton/>} />`. El prop `left` de `PageHeader` solo aplica a escritorio.
- [ ] **Step 4: Verde** (`rtk proxy npx vitest run src/components/PageHeader.test.tsx src/components/DocumentTitle.test.tsx`) y commit: `feat(movil): Tu cuenta en sheet y cabecera movil`.

---

### Task 6: Shell de liga

**Files:**
- Create: `src/components/league/DesktopLeagueShell.tsx` (markup actual de `LeagueLayout` desde `<PageHeader>` hasta el `<Outlet>`)
- Create: `src/components/shell/MobileLeagueShell.tsx`, `MobileLeagueShell.module.css`, `LeagueSwitcherSheet.tsx`, `MoreSheet.tsx`
- Modify: `src/components/league/LeagueLayout.tsx`, `LeagueLayout.test.tsx`

**Interfaces:**
- Consumes: `mobileNav`, `setLastLeague`, `navIcons`, `BottomNav`, `AppBar`, `Sheet`, `AccountButton`, `LeaguePhaseBadge`.
- Produces: `LeagueShellProps = { league: LeagueDetail; draftStatus: LeagueDraftStatus | undefined; phase: LeaguePhase; loadingDraft: boolean; isAdmin: boolean; section: string; children: ReactNode }` (tipos de `api/leagues` y `utils/leaguePhase`; `draftStatus` es lo que recibe `LeaguePhaseBadge`), compartido por `DesktopLeagueShell` y `MobileLeagueShell` (exportado desde `DesktopLeagueShell.tsx`). `LeagueLayout` sigue con la carga, los estados de carga y error, y `AvatarVersionsContext`, y pasa el `<Outlet>` como `children`.

- [ ] **Step 1: Tests que fallan** (`LeagueLayout.test.tsx`; los actuales se quedan en `'desktop'` con `useLayoutMode` mockeado)
- en `'mobile'` y temporada: la barra tiene Equipos, Calendario, Clasificación, Actividad y Más; la actual con `aria-current`.
- en `'mobile'` y draft en curso: Draft, Pool, Miembros y Más.
- "Más" abre un sheet con Draft, Configuración y Miembros (jugador) o además Gestionar tiers (admin). En `/config`, "Más" está marcado como actual.
- el nombre de la liga es un botón "Cambiar de liga" que abre un sheet con tus ligas (`getMyLeagues` mockeado) y la actual marcada; elegir otra navega a `/leagues/{id}`.
- con 2 intercambios pendientes en esta liga y 1 en otra (`getMyPendingTrades` mockeado), la pestaña Equipos muestra 2.
- al montar guarda la liga en `getLastLeague()`.
- con Configuración con cambios sin guardar (`useBlocker` de la página real o un componente de prueba con `useBlocker(true)` en la ruta), pulsar Equipos en la barra no cambia de ruta.

- [ ] **Step 2: Ejecutar** → FAIL.
- [ ] **Step 3: Implementar.** `LeagueLayout` llama a `setLastLeague(leagueId)` en un efecto cuando `league` existe y elige shell con `useLayoutMode()`. `MobileLeagueShell` usa la clase `shell` de su módulo, con `--league-tabs-h: 0px`. App bar: izquierda el botón de liga (nombre + `LeaguePhaseBadge` + `ChevronDown`), derecha `AccountButton`. Contenido con `padding-bottom: var(--bottom-nav-h)`. Badge de Equipos a partir de `['my-pending-trades']` filtrado por `leagueId`. `MoreSheet` con `<Link>` que cierran el sheet al pulsarlos. `moreActive` cuando `section` está en `more`. Fundido de contenido al cambiar `section` (`motion` con `key={section}`, `opacity` 0→1 en 150 ms, nada con reduced motion).
- [ ] **Step 4: Verde** (`rtk proxy npx vitest run src/components/league`) y commit: `feat(movil): shell de liga con barra inferior y sheets`.

---

### Task 7: `/` en móvil va a la última liga

**Files:**
- Modify: `src/pages/HomePage.tsx`, `src/pages/HomePage.test.tsx`

**Interfaces:**
- Consumes: `getLastLeague`, `useLayoutMode`, query `['my-leagues']`.

- [ ] **Step 1: Tests que fallan** (`useLayoutMode` mockeado)
- `'mobile'`, última liga `'L1'` y `getMyLeagues` con `L1`: redirige a `/leagues/L1` (`replace`).
- `'mobile'`, última liga `'L9'` que no está en tus ligas: redirige a `/leagues`.
- `'mobile'` sin última liga: redirige a `/leagues`.
- `'mobile'` mientras carga `my-leagues`: muestra el skeleton, ni la home ni redirección.
- `'desktop'`: la home de siempre (los tests actuales siguen pasando).

- [ ] **Step 2: Ejecutar** → FAIL.
- [ ] **Step 3: Implementar** con `<Navigate replace>` antes del render actual cuando el modo es `'mobile'`. Las queries de la home de escritorio no se lanzan en móvil (`enabled` según el modo).
- [ ] **Step 4: Verde** y commit: `feat(movil): la portada lleva a la ultima liga`.

---

### Task 8: Fijos y pegajosos sobre la barra inferior, y verificación en el navegador

**Files:**
- Modify: `src/styles/tokens.css` (final del `:root`: `--bottom-nav-h: 0px;` y regla `:root:has([data-bottom-nav]) { --bottom-nav-h: calc(64px + env(safe-area-inset-bottom)); }` después del bloque del tema claro)
- Modify: `src/styles/config.css` (barra de guardar: de `bottom: calc(0.75rem + env(safe-area-inset-bottom))` a `bottom: calc(0.75rem + max(var(--bottom-nav-h), env(safe-area-inset-bottom)))`; `--bottom-nav-h` ya incluye el safe area, así no se suma dos veces)
- Modify: `src/styles/pool.css` (`.setup-move-bar`: `bottom: calc(0.75rem + var(--bottom-nav-h))`)
- Modify: `src/components/ToastContainer.tsx` (`bottom: 'calc(1.5rem + var(--bottom-nav-h))'`)

- [ ] **Step 1: Cambios** de la lista.
- [ ] **Step 2: Build y tests**: `npm run build; rtk proxy npx vitest run` → verde.
- [ ] **Step 3: Navegador** (backend local como en el subproyecto 1: Docker con Mongo y Redis, jar en `pokefantasy/src/boot/target`, usuario `visualtest` miembro de la liga local `6abbde0c7c96377510ad4005`; contraseña en el scratchpad de la sesión o se crea otro usuario y se añade igual). `preview_start` con `pokefantasy-web-dev`. A 375 px:
  - `/` lleva a la liga; las 4 pestañas y "Más" navegan; "Más" y "Cambiar de liga" abren y cierran (fondo, Escape, arrastre);
  - "Tu cuenta" desde la liga y desde `/profile`; el "Volver" de `/profile` vuelve a la liga;
  - en Configuración con un cambio: la barra de guardar queda por encima de la barra inferior; lanzar un toast (guardar con error o cualquier acción) y comprobar que no queda tapado;
  - `document.documentElement.scrollWidth <= innerWidth` en cada pantalla.
  A 1280 px: Equipos, Configuración y `/` iguales que en `feature/movil-cimientos` (sin barra inferior ni app bar, `--bottom-nav-h` = `0px` con `getComputedStyle`).
  Guardar capturas a 375 px de Equipos, "Más" abierto y "Tu cuenta" abierto para el PR.
- [ ] **Step 4: Commit**: `feat(movil): fijos por encima de la barra inferior`.

---

### Task 9: Documentación y PR

**Files:**
- Modify: `CLAUDE.md` del front, §7: fila nueva "Shell móvil | `src/components/shell/` (CSS Modules); paneles en móvil con `Sheet`, en escritorio con `Modal`; iconos con `lucide-react`; atrás de Android con `useBackHandler`".
- Vault (`git pull` antes; commit a `main` y push):
  - `50 Features/Diseño móvil de app.md`: subproyecto 2 con su PR, el reparto Más/Tu cuenta, la pila del atrás y la resolución de la pregunta abierta de la tablet (el shell depende del modo y el contenido del ancho; tachar esa pregunta). La de la sintaxis de rango sigue abierta.
  - `40 Frontend/Estructura frontend.md`: fila `components/shell/`, `useBackButton` y `useSectionTitle` en hooks, `lastLeague` en utils; quitar `UserDrawer`.
  - `40 Frontend/Convenciones frontend.md`: iconos con `lucide-react`; `Sheet` frente a `Modal`; `useBackHandler` para cualquier panel nuevo que se cierre con atrás; la mención a `UserDrawer` en la línea de modales pasa a `Sheet`.
  - `40 Frontend/App Android.md`: botón atrás (pila → historial → minimizar).

- [ ] **Step 1: Documentación.**
- [ ] **Step 2: Verificación completa**: `npm run lint; npm test; npm run build` → verde.
- [ ] **Step 3: Commit y push**: `docs: shell movil` y `git push -u origin feature/movil-shell`.
- [ ] **Step 4: PR** con `base: feature/movil-cimientos`, título `Diseño móvil (2/4): shell de app`. Cuerpo: qué cambia, cómo se verificó, capturas de la Task 8, que va apilado sobre #140 y se mergea junto, y que el atrás de Android se prueba en dispositivo en el subproyecto 4. Terminar con `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.
- [ ] **Step 5: Vault**: número del PR en `prs_front` de la nota; commit y push.
