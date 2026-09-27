# Navegación de liga Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Todas las subrutas de una liga comparten cabecera, pestañas por fase y menú de engranaje; la navegación usa enlaces reales y el aviso de cambios sin guardar de Configuración cubre cualquier salida.

**Architecture:** Se migra de `<BrowserRouter>` a `createBrowserRouter` con una ruta raíz (`RootLayout`) y una ruta de layout anidada `/leagues/:leagueId` (`LeagueLayout`). Qué pestañas y entradas de menú hay en cada fase lo decide una función pura (`utils/leagueNav.ts`) sobre `leaguePhase` (punto 2). Las páginas de liga dejan de pintar `PageHeader` y botones de volver; Configuración bloquea con `useBlocker`.

**Tech Stack:** React 19, react-router-dom 7.18 (`createBrowserRouter`, `RouterProvider`, `createMemoryRouter`, `useBlocker`, `Link`, `Outlet`), React Query 5, Vitest + Testing Library, CSS en `src/index.css`.

**Spec:** Sin documento de diseño (preferencia del usuario: brainstorming → diseño aprobado en chat → plan). El diseño aprobado se resume en "Diseño" abajo. Nota de feature: `vault/50 Features/Navegación de liga.md`.

## Diseño (aprobado en chat, 2026-09-27)
- Pestañas por fase (`leaguePhase` de `utils/leaguePhase.ts`):
  - setup / cancelled: Miembros · Pool · Draft
  - draft: Draft · Pool · Miembros
  - season: Equipos · Calendario · Clasificación · Actividad · Draft
- Menú de engranaje: Configuración (siempre; los no admin la ven de solo lectura), Gestionar tiers (admin y season), Miembros (season).
- `/leagues/:leagueId` (index) redirige con `replace` a la primera pestaña de la fase. Ruta nueva `/leagues/:leagueId/members` (antes `LeagueDetailPage`, ahora `LeagueMembersPage`). El resto de URLs no cambia.
- Perfil de jugador (`players/:username`) marca activa Clasificación.
- Móvil: tira horizontal con scroll, fija bajo la cabecera; la pestaña activa se centra (`scrollIntoView`, sin animación con reduced motion).
- Configuración: `useBlocker` con el modal existente; se mantiene `beforeunload`.
- Enlaces reales (`<Link>`) en cabecera, pestañas, menú, tarjetas de Home y Mis ligas, filas de Clasificación.

## Global Constraints
- Rama `feature/navegacion-liga` en el worktree `C:\PokeFantasy\pf-web-nav`, PR contra `main` de `Pokemons-Fantasy/pokefantasy-web`.
- Sin cambios de backend ni de `src/api/*`. Las URLs existentes siguen funcionando.
- Mismas query keys que las páginas: `['league-detail', leagueId]` y `['draft-status', leagueId]` (no llamadas nuevas al backend).
- Textos de la UI en español; sin emojis nuevos (los existentes en títulos se quedan: punto 13).
- Accesibilidad: `<nav aria-label="Secciones de la liga">`, `aria-current="page"` en la pestaña/entrada activa, disclosure con `aria-expanded`/`aria-controls`, foco visible.
- `prefers-reduced-motion` respetado vía `hooks/useReducedMotion.ts` (`useReducedMotion(): boolean`).
- Antes de push: `npm run lint`, `npm run api:check`, `npm test`, `npm run build`. En Windows `api:check` da falso negativo por CRLF (ver vault Gotchas); comprobar con el archivo en LF.
- Lint del repo activa `react-hooks/set-state-in-effect`: no hacer `setState` dentro de `useEffect` salvo con el comentario de excepción que ya usa el repo.
- Commits con `git commit -F <archivo>` (en PowerShell los `/` del mensaje disparan la protección de Remove-Item) y la línea `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus
1. **Guardar en Configuración y navegar enseguida** no debe pedir confirmación: tras `onSuccess` el formulario ya coincide con lo guardado (Task 5 fija `setQueryData`; test incluido).
2. **Panel propio sticky de Equipos** (`.own-team-panel`, `top: calc(60px + safe-area)`) no puede quedar tapado por la tira de pestañas fija (Task 3 introduce `--league-tabs-h`; Task 4 ajusta el `top`; comprobación visual en Task 7).
3. **jsdom no implementa `scrollIntoView`**: la pestaña activa debe centrarse sin romper tests (llamada opcional `?.`; lo cubren los tests de Task 3).
4. **Liga inexistente o sin ser miembro** (`getLeagueDetail` rechaza): el layout muestra "Liga no encontrada" una vez y no pinta pestañas (test en Task 3).
5. **Enlaces antiguos a `/leagues/:id`** (invitaciones, push, Home, Mis ligas, `PendingTradesBanner`) deben acabar en la pestaña de la fase, sin quedarse en blanco mientras carga el draft (test de redirección en Task 3).

---

## File Structure
- Create `src/utils/leagueNav.ts` (+ `leagueNav.test.ts`): pestañas, menú, primera pestaña y sección activa. Lógica pura.
- Create `src/components/league/LeagueLayout.tsx`: cabecera global + barra de liga + pestañas + `<Outlet>`.
- Create `src/components/league/LeagueTabs.tsx`: tira de pestañas.
- Create `src/components/league/LeagueMenu.tsx`: engranaje (disclosure).
- Create `src/components/league/LeagueIndexRedirect.tsx`: redirección del index.
- Create `src/components/league/LeagueLayout.test.tsx`.
- Rename `src/pages/LeagueDetailPage.tsx` → `src/pages/LeagueMembersPage.tsx`.
- Modify `src/App.tsx`: router de datos, `RootLayout`, rutas anidadas.
- Modify páginas de liga: `PoolPage`, `DraftPage`, `TeamsPage`, `SchedulePage`, `StandingsPage`, `ActivityPage`, `TierManagementPage`, `PlayerProfilePage`, `LeagueConfigPage`.
- Modify `src/components/PageHeader.tsx`, `src/pages/HomePage.tsx`, `src/pages/LeaguesPage.tsx`, `src/index.css`.
- Modify `src/pages/LeagueConfigPage.test.tsx`.

---

### Task 1: Navegación por fase (lógica pura)

**Files:**
- Create: `src/utils/leagueNav.ts`
- Test: `src/utils/leagueNav.test.ts`

**Interfaces:**
- Consumes: `LeaguePhase` de `src/utils/leaguePhase.ts` (`'setup' | 'draft' | 'season' | 'cancelled'`).
- Produces:
  - `interface LeagueNavItem { path: string; label: string }`
  - `leagueTabs(phase: LeaguePhase): LeagueNavItem[]`
  - `leagueMenu(phase: LeaguePhase, isAdmin: boolean): LeagueNavItem[]`
  - `firstTab(phase: LeaguePhase): string`
  - `activeSection(subpath: string): string`

- [ ] **Step 1: Write the failing test**

`src/utils/leagueNav.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { leagueTabs, leagueMenu, firstTab, activeSection } from './leagueNav';

const labels = (items: { label: string }[]) => items.map((i) => i.label);

describe('leagueTabs', () => {
  it('en preparación: Miembros, Pool, Draft', () => {
    expect(labels(leagueTabs('setup'))).toEqual(['Miembros', 'Pool', 'Draft']);
  });

  it('con el draft cancelado se comporta como en preparación', () => {
    expect(leagueTabs('cancelled')).toEqual(leagueTabs('setup'));
  });

  it('con el draft en curso, el draft va primero', () => {
    expect(labels(leagueTabs('draft'))).toEqual(['Draft', 'Pool', 'Miembros']);
  });

  it('en temporada: Equipos, Calendario, Clasificación, Actividad, Draft', () => {
    expect(leagueTabs('season').map((t) => t.path))
      .toEqual(['teams', 'schedule', 'standings', 'activity', 'draft']);
  });
});

describe('leagueMenu', () => {
  it('fuera de temporada solo Configuración, también para admin', () => {
    expect(labels(leagueMenu('setup', true))).toEqual(['Configuración']);
    expect(labels(leagueMenu('draft', true))).toEqual(['Configuración']);
  });

  it('en temporada el admin ve Gestionar tiers y Miembros', () => {
    expect(labels(leagueMenu('season', true))).toEqual(['Configuración', 'Gestionar tiers', 'Miembros']);
  });

  it('en temporada un jugador no ve Gestionar tiers', () => {
    expect(labels(leagueMenu('season', false))).toEqual(['Configuración', 'Miembros']);
  });
});

describe('firstTab', () => {
  it('es la primera pestaña de la fase', () => {
    expect(firstTab('setup')).toBe('members');
    expect(firstTab('draft')).toBe('draft');
    expect(firstTab('season')).toBe('teams');
  });
});

describe('activeSection', () => {
  it('usa el primer segmento de la subruta', () => {
    expect(activeSection('schedule')).toBe('schedule');
    expect(activeSection('')).toBe('');
  });

  it('el perfil de un jugador cuelga de Clasificación', () => {
    expect(activeSection('players/ash')).toBe('standings');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/utils/leagueNav.test.ts`
Expected: FAIL, `Failed to resolve import "./leagueNav"`.

- [ ] **Step 3: Write minimal implementation**

`src/utils/leagueNav.ts`:
```ts
import type { LeaguePhase } from './leaguePhase';

/** Destino relativo a `/leagues/:leagueId` y su texto. */
export interface LeagueNavItem {
  path: string;
  label: string;
}

const MEMBERS: LeagueNavItem = { path: 'members', label: 'Miembros' };
const POOL: LeagueNavItem = { path: 'pool', label: 'Pool' };
const DRAFT: LeagueNavItem = { path: 'draft', label: 'Draft' };
const TEAMS: LeagueNavItem = { path: 'teams', label: 'Equipos' };
const SCHEDULE: LeagueNavItem = { path: 'schedule', label: 'Calendario' };
const STANDINGS: LeagueNavItem = { path: 'standings', label: 'Clasificación' };
const ACTIVITY: LeagueNavItem = { path: 'activity', label: 'Actividad' };
const CONFIG: LeagueNavItem = { path: 'config', label: 'Configuración' };
const TIERS: LeagueNavItem = { path: 'tiers', label: 'Gestionar tiers' };

/** Pestañas de la liga según su fase: primero lo que más se usa en cada momento. */
export function leagueTabs(phase: LeaguePhase): LeagueNavItem[] {
  switch (phase) {
    case 'draft': return [DRAFT, POOL, MEMBERS];
    case 'season': return [TEAMS, SCHEDULE, STANDINGS, ACTIVITY, DRAFT];
    default: return [MEMBERS, POOL, DRAFT];
  }
}

/** Entradas del menú de engranaje. Gestionar tiers exige draft completado (regla de TierManagementPage). */
export function leagueMenu(phase: LeaguePhase, isAdmin: boolean): LeagueNavItem[] {
  if (phase !== 'season') return [CONFIG];
  return isAdmin ? [CONFIG, TIERS, MEMBERS] : [CONFIG, MEMBERS];
}

export function firstTab(phase: LeaguePhase): string {
  return leagueTabs(phase)[0].path;
}

/** Sección que se marca como activa para una subruta (`players/ash` cuelga de Clasificación). */
export function activeSection(subpath: string): string {
  const first = subpath.split('/')[0];
  return first === 'players' ? STANDINGS.path : first;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/utils/leagueNav.test.ts`
Expected: PASS (10 tests).

- [ ] **Step 5: Commit**

```bash
git add src/utils/leagueNav.ts src/utils/leagueNav.test.ts
git commit -F <archivo con "feat: pestañas y menú de liga por fase (utils/leagueNav)">
```

---

### Task 2: Router de datos (`createBrowserRouter`) sin cambios de comportamiento

**Files:**
- Modify: `src/App.tsx` (entero)

**Interfaces:**
- Produces: `RootLayout` (interno de `App.tsx`) con `ToastContainer`, `DeepLinkHandler`, `GlobalNotifications`, `ErrorBoundaryWithReset` y `<Outlet>`. Las rutas quedan planas en esta task; Task 3 las anida.

- [ ] **Step 1: Reescribir el montaje del router**

En `src/App.tsx`:
1. Cambiar el import de react-router por:
```ts
import { createBrowserRouter, RouterProvider, Navigate, Outlet, useNavigate, useLocation } from 'react-router-dom';
```
2. Añadir, tras `DeepLinkHandler`:
```tsx
/** Todo lo que necesita estar dentro del router (navegación, ubicación) vive aquí. */
function RootLayout() {
  return (
    <>
      <ToastContainer />
      <DeepLinkHandler />
      <GlobalNotifications />
      <ErrorBoundaryWithReset>
        <Outlet />
      </ErrorBoundaryWithReset>
    </>
  );
}

const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      { path: '/login', element: <LoginPage /> },
      { path: '/register', element: <RegisterPage /> },
      {
        element: <ProtectedRoute />,
        children: [
          { path: '/', element: <HomePage /> },
          { path: '/profile', element: <MyProfilePage /> },
          { path: '/leagues', element: <LeaguesPage /> },
          { path: '/leagues/:leagueId', element: <LeagueDetailPage /> },
          { path: '/leagues/:leagueId/pool', element: <PoolPage /> },
          { path: '/leagues/:leagueId/draft', element: <DraftPage /> },
          { path: '/leagues/:leagueId/teams', element: <TeamsPage /> },
          { path: '/leagues/:leagueId/config', element: <LeagueConfigPage /> },
          { path: '/leagues/:leagueId/schedule', element: <SchedulePage /> },
          { path: '/leagues/:leagueId/tiers', element: <TierManagementPage /> },
          { path: '/leagues/:leagueId/activity', element: <ActivityPage /> },
          { path: '/leagues/:leagueId/standings', element: <StandingsPage /> },
          { path: '/leagues/:leagueId/players/:username', element: <PlayerProfilePage /> },
          { path: '/invite/:token', element: <InvitePage /> },
        ],
      },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]);
```
3. En el `return` de `App`, sustituir todo el bloque `<BrowserRouter> … </BrowserRouter>` por:
```tsx
      <RouterProvider router={router} />
```
(el `<div>` de la versión y `QueryClientProvider` se quedan igual).

- [ ] **Step 2: Verificar tipos, lint y tests**

Run: `npx tsc --noEmit -p tsconfig.app.json` → sin errores.
Run: `npx eslint src/App.tsx` → sin errores.
Run: `npx vitest run` → todos PASS (los tests de páginas usan su propio `MemoryRouter`).

- [ ] **Step 3: Verificar en navegador**

`npm run dev -- --port 5174 --strictPort` (preview), con sesión iniciada por el usuario: navegar Home → Mis ligas → liga → Pool → atrás del navegador; un toast con acción (`actionUrl`) sigue navegando. Sin errores en consola.

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx
git commit -F <archivo con "refactor: router de datos (createBrowserRouter) con RootLayout">
```

---

### Task 3: `LeagueLayout`, pestañas, menú, redirección y ruta `members`

**Files:**
- Create: `src/components/league/LeagueLayout.tsx`, `LeagueTabs.tsx`, `LeagueMenu.tsx`, `LeagueIndexRedirect.tsx`
- Test: `src/components/league/LeagueLayout.test.tsx`
- Rename: `src/pages/LeagueDetailPage.tsx` → `src/pages/LeagueMembersPage.tsx`
- Modify: `src/App.tsx` (rutas de liga), `src/index.css` (sección nueva)

**Interfaces:**
- Consumes: `leagueTabs`, `leagueMenu`, `firstTab`, `activeSection`, `LeagueNavItem` (Task 1); `leaguePhase` (`utils/leaguePhase.ts`); `LeaguePhaseBadge` (`components/LeaguePhaseBadge.tsx`, prop `draftStatus`); `getLeagueDetail` (`api/leagues`), `getDraftStatus` (`api/pokemons`, devuelve `DraftStatus | null`); `useReducedMotion` (`hooks/useReducedMotion`); `PageHeader` (prop `left?: ReactNode`); `SkeletonTable` (`components/SkeletonTable`, prop `rows`).
- Produces: `LeagueLayout` (default export, sin props), `LeagueIndexRedirect` (default, sin props), `LeagueTabs({ tabs: LeagueNavItem[]; active: string })`, `LeagueMenu({ items: LeagueNavItem[]; active: string })`, `LeagueMembersPage` (default). CSS: `--league-tabs-h`, clases `league-bar`, `league-bar-inner`, `league-bar-title`, `league-bar-name`, `league-tabs-bar`, `league-tabs`, `league-tab`, `league-menu`, `league-menu-button`, `league-menu-list`, `league-menu-item`, `header-left`.

- [ ] **Step 1: Write the failing test**

`src/components/league/LeagueLayout.test.tsx`:
```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import LeagueLayout from './LeagueLayout';
import LeagueIndexRedirect from './LeagueIndexRedirect';
import { useAuthStore } from '../../store/authStore';
import * as leaguesApi from '../../api/leagues';
import * as pokemonsApi from '../../api/pokemons';
import type { LeagueDetail } from '../../api/leagues';
import type { DraftStatus } from '../../api/pokemons';

vi.mock('../../api/leagues', async (importOriginal) => ({
  ...(await importOriginal<typeof leaguesApi>()),
  getLeagueDetail: vi.fn(),
}));
vi.mock('../../api/pokemons', async (importOriginal) => ({
  ...(await importOriginal<typeof pokemonsApi>()),
  getDraftStatus: vi.fn(),
}));

const mockedLeague = vi.mocked(leaguesApi.getLeagueDetail);
const mockedDraft = vi.mocked(pokemonsApi.getDraftStatus);

const LEAGUE: LeagueDetail = {
  id: 'l1',
  name: 'Liga Kanto',
  createdBy: 'ash',
  status: 'SETUP',
  members: [
    { username: 'ash', leagueRole: 'ADMIN' },
    { username: 'brock', leagueRole: 'USER' },
  ],
};

const draft = (status: DraftStatus['status']): DraftStatus => ({
  id: 'd1', status, turnOrder: ['ash', 'brock'], currentTurn: null, currentRound: 1, picks: [],
});

function renderAt(path: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = createMemoryRouter([
    {
      path: '/leagues/:leagueId',
      element: <LeagueLayout />,
      children: [
        { index: true, element: <LeagueIndexRedirect /> },
        { path: '*', element: <p>contenido de la sección</p> },
      ],
    },
  ], { initialEntries: [path] });
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return router;
}

const tabNames = () =>
  screen.getAllByRole('link').filter((l) => l.classList.contains('league-tab')).map((l) => l.textContent);

describe('LeagueLayout', () => {
  beforeEach(() => {
    useAuthStore.setState({ username: 'ash' });
    mockedLeague.mockResolvedValue(LEAGUE);
    mockedDraft.mockResolvedValue(draft('COMPLETED'));
  });

  it('en temporada muestra las pestañas de temporada y marca la actual', async () => {
    renderAt('/leagues/l1/schedule');

    const current = await screen.findByRole('link', { name: 'Calendario' });
    expect(current).toHaveAttribute('aria-current', 'page');
    expect(tabNames()).toEqual(['Equipos', 'Calendario', 'Clasificación', 'Actividad', 'Draft']);
    expect(screen.getByRole('navigation', { name: 'Secciones de la liga' })).toBeInTheDocument();
    expect(screen.getByText('Liga Kanto')).toBeInTheDocument();
  });

  it('el perfil de un jugador marca Clasificación', async () => {
    renderAt('/leagues/l1/players/brock');
    expect(await screen.findByRole('link', { name: 'Clasificación' })).toHaveAttribute('aria-current', 'page');
  });

  it('sin draft muestra las pestañas de preparación', async () => {
    mockedDraft.mockResolvedValue(null);
    renderAt('/leagues/l1/pool');
    await screen.findByRole('link', { name: 'Pool' });
    expect(tabNames()).toEqual(['Miembros', 'Pool', 'Draft']);
  });

  it('la portada de la liga redirige a la primera pestaña de la fase', async () => {
    const router = renderAt('/leagues/l1');
    await waitFor(() => expect(router.state.location.pathname).toBe('/leagues/l1/teams'));
  });

  it('sin draft, la portada redirige a Miembros', async () => {
    mockedDraft.mockResolvedValue(null);
    const router = renderAt('/leagues/l1');
    await waitFor(() => expect(router.state.location.pathname).toBe('/leagues/l1/members'));
  });

  it('el menú se abre, muestra las entradas de admin y se cierra con Escape devolviendo el foco', async () => {
    renderAt('/leagues/l1/teams');
    const button = await screen.findByRole('button', { name: 'Más opciones de la liga' });
    expect(button).toHaveAttribute('aria-expanded', 'false');

    await userEvent.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('link', { name: 'Configuración' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Gestionar tiers' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Miembros' })).toBeInTheDocument();

    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('link', { name: 'Configuración' })).not.toBeInTheDocument();
    expect(button).toHaveFocus();
  });

  it('un jugador no ve Gestionar tiers', async () => {
    useAuthStore.setState({ username: 'brock' });
    renderAt('/leagues/l1/teams');
    await userEvent.click(await screen.findByRole('button', { name: 'Más opciones de la liga' }));
    expect(screen.getByRole('link', { name: 'Configuración' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Gestionar tiers' })).not.toBeInTheDocument();
  });

  it('con Configuración abierta el engranaje se marca activo', async () => {
    renderAt('/leagues/l1/config');
    const button = await screen.findByRole('button', { name: 'Más opciones de la liga' });
    expect(button).toHaveClass('active');
  });

  it('si la liga no existe o no eres miembro, avisa y no pinta pestañas', async () => {
    mockedLeague.mockRejectedValue(new Error('403'));
    renderAt('/leagues/l1/teams');
    expect(await screen.findByText('Liga no encontrada')).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Secciones de la liga' })).not.toBeInTheDocument();
    expect(screen.queryByText('contenido de la sección')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/league/LeagueLayout.test.tsx`
Expected: FAIL, `Failed to resolve import "./LeagueLayout"`.

- [ ] **Step 3: Implementar `LeagueTabs`**

`src/components/league/LeagueTabs.tsx`:
```tsx
import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import type { LeagueNavItem } from '../../utils/leagueNav';
import { useReducedMotion } from '../../hooks/useReducedMotion';

interface LeagueTabsProps {
  tabs: LeagueNavItem[];
  /** Sección activa (ver activeSection); '' si ninguna pestaña lo está. */
  active: string;
}

export default function LeagueTabs({ tabs, active }: LeagueTabsProps) {
  const activeRef = useRef<HTMLAnchorElement>(null);
  const reduceMotion = useReducedMotion();

  // En móvil la tira hace scroll: la pestaña activa se centra al cambiar de sección.
  // scrollIntoView es opcional porque jsdom no lo implementa.
  useEffect(() => {
    activeRef.current?.scrollIntoView?.({
      inline: 'center',
      block: 'nearest',
      behavior: reduceMotion ? 'auto' : 'smooth',
    });
  }, [active, reduceMotion]);

  return (
    <nav className="league-tabs" aria-label="Secciones de la liga">
      {tabs.map((tab) => {
        const isActive = tab.path === active;
        return (
          <Link
            key={tab.path}
            to={tab.path}
            ref={isActive ? activeRef : undefined}
            className={`league-tab${isActive ? ' active' : ''}`}
            aria-current={isActive ? 'page' : undefined}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
```

- [ ] **Step 4: Implementar `LeagueMenu`**

`src/components/league/LeagueMenu.tsx`:
```tsx
import { useEffect, useId, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type { LeagueNavItem } from '../../utils/leagueNav';

interface LeagueMenuProps {
  items: LeagueNavItem[];
  active: string;
}

/** Menú de engranaje (patrón disclosure): acciones de la liga que no son pestañas. */
export default function LeagueMenu({ items, active }: LeagueMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listId = useId();
  const isActive = items.some((item) => item.path === active);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    const onPointerDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('mousedown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('mousedown', onPointerDown);
    };
  }, [open]);

  return (
    <div className="league-menu" ref={rootRef}>
      <button
        ref={buttonRef}
        type="button"
        className={`btn-ghost league-menu-button${isActive ? ' active' : ''}`}
        aria-label="Más opciones de la liga"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((o) => !o)}
      >
        ⚙
      </button>
      {open && (
        <div id={listId} className="league-menu-list">
          {items.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className="league-menu-item"
              aria-current={item.path === active ? 'page' : undefined}
              onClick={() => setOpen(false)}
            >
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Implementar `LeagueLayout` y `LeagueIndexRedirect`**

`src/components/league/LeagueLayout.tsx`:
```tsx
import { Link, Outlet, useLocation, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getLeagueDetail } from '../../api/leagues';
import { getDraftStatus } from '../../api/pokemons';
import { useAuthStore } from '../../store/authStore';
import { leaguePhase } from '../../utils/leaguePhase';
import { activeSection, leagueMenu, leagueTabs } from '../../utils/leagueNav';
import PageHeader from '../PageHeader';
import LeaguePhaseBadge from '../LeaguePhaseBadge';
import { SkeletonTable } from '../SkeletonTable';
import LeagueTabs from './LeagueTabs';
import LeagueMenu from './LeagueMenu';

/** Marco común de /leagues/:leagueId/*: cabecera, nombre y fase, pestañas y menú. */
export default function LeagueLayout() {
  const { leagueId } = useParams<{ leagueId: string }>();
  const { pathname } = useLocation();
  const username = useAuthStore((s) => s.username);

  // Mismas query keys que las páginas: la caché se comparte, no hay llamadas extra.
  const { data: league, isLoading } = useQuery({
    queryKey: ['league-detail', leagueId],
    queryFn: () => getLeagueDetail(leagueId!),
    enabled: !!leagueId,
  });
  const { data: draft, isLoading: loadingDraft } = useQuery({
    queryKey: ['draft-status', leagueId],
    queryFn: () => getDraftStatus(leagueId!),
    enabled: !!leagueId,
  });

  const phase = leaguePhase(draft?.status ?? null);
  const isAdmin = !!league?.members.some((m) => m.username === username && m.leagueRole === 'ADMIN');
  const base = `/leagues/${leagueId}`;
  const section = activeSection(pathname.slice(base.length + 1));

  return (
    <div className="page-wrapper league-page">
      <PageHeader left={
        <div className="header-left">
          <Link className="btn-back" to="/leagues">← Mis ligas</Link>
          <Link className="logo" to="/">PokeFantasy</Link>
        </div>
      } />

      {isLoading && (
        <main className="page-content"><SkeletonTable rows={4} /></main>
      )}

      {!isLoading && !league && (
        <main className="page-content"><p className="error">Liga no encontrada</p></main>
      )}

      {league && (
        <>
          <div className="league-bar">
            <div className="league-bar-inner">
              <div className="league-bar-title">
                <span className="league-bar-name">{league.name}</span>
                {!loadingDraft && <LeaguePhaseBadge draftStatus={draft?.status ?? null} />}
              </div>
              {!loadingDraft && <LeagueMenu items={leagueMenu(phase, isAdmin)} active={section} />}
            </div>
          </div>
          <div className="league-tabs-bar">
            {!loadingDraft && <LeagueTabs tabs={leagueTabs(phase)} active={section} />}
          </div>
          <Outlet />
        </>
      )}
    </div>
  );
}
```

`src/components/league/LeagueIndexRedirect.tsx`:
```tsx
import { Navigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getDraftStatus } from '../../api/pokemons';
import { leaguePhase } from '../../utils/leaguePhase';
import { firstTab } from '../../utils/leagueNav';
import { SkeletonTable } from '../SkeletonTable';

/** /leagues/:leagueId lleva a la primera pestaña de la fase (enlaces antiguos, invitaciones, push). */
export default function LeagueIndexRedirect() {
  const { leagueId } = useParams<{ leagueId: string }>();
  const { data: draft, isLoading } = useQuery({
    queryKey: ['draft-status', leagueId],
    queryFn: () => getDraftStatus(leagueId!),
    enabled: !!leagueId,
  });

  if (isLoading) {
    return <main className="page-content"><SkeletonTable rows={4} /></main>;
  }
  return <Navigate to={firstTab(leaguePhase(draft?.status ?? null))} replace />;
}
```

- [ ] **Step 6: CSS de la navegación de liga**

En `src/index.css`, justo antes de `/* ─── SCHEDULE / JORNADAS ─── */`, añadir:
```css
/* ─── LEAGUE LAYOUT (components/league/) ─── */

.header-left { display: flex; align-items: center; gap: 0.75rem; }
a.btn-back, a.logo { text-decoration: none; }

/* Altura fija de la tira: la usan los elementos sticky de las páginas para colocarse debajo */
.league-page { --league-tabs-h: 44px; }

.league-bar-inner {
  max-width: 1100px;
  margin: 0 auto;
  padding: 1rem 1.5rem 0.25rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}
.league-bar-title { display: flex; align-items: center; gap: 0.6rem; min-width: 0; }
.league-bar-name {
  font-size: 1.15rem;
  font-weight: 800;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.league-tabs-bar {
  position: sticky;
  top: calc(60px + env(safe-area-inset-top));
  z-index: 45;              /* bajo la cabecera (50), sobre el panel propio de Equipos (40) */
  background: var(--bg);
  border-bottom: 1px solid var(--border);
  min-height: var(--league-tabs-h);
}
.league-tabs {
  max-width: 1100px;
  margin: 0 auto;
  padding: 0 1.5rem;
  height: var(--league-tabs-h);
  display: flex;
  align-items: stretch;
  gap: 0.25rem;
  overflow-x: auto;
  scroll-snap-type: x proximity;
  scrollbar-width: none;
}
.league-tabs::-webkit-scrollbar { display: none; }
.league-tab {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  scroll-snap-align: center;
  padding: 0 0.9rem;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text-2);
  text-decoration: none;
  white-space: nowrap;
  border-bottom: 2px solid transparent;
  transition: color 0.15s, border-color 0.15s;
}
.league-tab:hover { color: var(--text); }
.league-tab.active { color: var(--accent); border-bottom-color: var(--accent); }
.league-tab:focus-visible,
.league-menu-item:focus-visible { outline: 2px solid var(--accent); outline-offset: -2px; }

.league-menu { position: relative; flex-shrink: 0; }
.league-menu-button { padding: 0.35rem 0.6rem; font-size: 1rem; line-height: 1; }
.league-menu-button.active { border-color: var(--accent); color: var(--accent); }
.league-menu-list {
  position: absolute;
  right: 0;
  top: calc(100% + 0.4rem);
  z-index: 60;
  min-width: 190px;
  display: flex;
  flex-direction: column;
  padding: 0.35rem;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  box-shadow: var(--shadow-lg);
}
.league-menu-item {
  padding: 0.55rem 0.75rem;
  border-radius: 6px;
  color: var(--text);
  text-decoration: none;
  font-size: 0.875rem;
}
.league-menu-item:hover,
.league-menu-item[aria-current="page"] { background: var(--surface-2); }

@media (max-width: 640px) {
  .league-bar-inner { padding: 0.75rem 1rem 0.25rem; }
  .league-tabs { padding: 0 0.5rem; }
}
```
Y en el bloque `@media (max-width: 640px)` existente, dentro de la regla `.header-right .btn-ghost`, añadir `white-space: nowrap;` ("Cerrar sesión" no se parte).

- [ ] **Step 7: Renombrar la página de detalle a `LeagueMembersPage`**

Run: `git mv src/pages/LeagueDetailPage.tsx src/pages/LeagueMembersPage.tsx`

En `src/pages/LeagueMembersPage.tsx`:
1. `export default function LeagueDetailPage()` → `export default function LeagueMembersPage()`.
2. Quitar los imports de `PageHeader` y `LeaguePhaseBadge`.
3. Sustituir los dos retornos tempranos (líneas del `if (isLoading)` y `if (!league)`) por:
```tsx
  if (isLoading || !league) {
    // El layout ya muestra "Liga no encontrada" si la liga no carga.
    return <main className="page-content"><SkeletonTable rows={4} /></main>;
  }
```
4. En el `return` principal: quitar el `<div className="page-wrapper">` exterior (y su cierre) y el bloque `<PageHeader left={…} />`; envolver en un fragmento `<>…</>` el `<main>` y el modal `confirmRemove`.
5. Sustituir el bloque `<div className="section-header"> … </div>` (título, subtítulo y `section-actions` con badge y botones de navegación) por:
```tsx
        <div className="section-header">
          <div>
            <h1 className="page-title">Miembros</h1>
            <p className="page-subtitle">Creada por {league.createdBy}</p>
          </div>
        </div>
```
6. `navigate` sigue usándose (salir de la liga, iniciar draft): no se quita.

- [ ] **Step 8: Anidar las rutas de liga en `App.tsx`**

En `src/App.tsx`:
1. Imports: sustituir `import LeagueDetailPage from './pages/LeagueDetailPage';` por
```ts
import LeagueMembersPage from './pages/LeagueMembersPage';
import LeagueLayout from './components/league/LeagueLayout';
import LeagueIndexRedirect from './components/league/LeagueIndexRedirect';
```
2. Sustituir las 11 entradas `/leagues/:leagueId…` de `ProtectedRoute.children` por:
```tsx
          {
            path: '/leagues/:leagueId',
            element: <LeagueLayout />,
            children: [
              { index: true, element: <LeagueIndexRedirect /> },
              { path: 'members', element: <LeagueMembersPage /> },
              { path: 'pool', element: <PoolPage /> },
              { path: 'draft', element: <DraftPage /> },
              { path: 'teams', element: <TeamsPage /> },
              { path: 'config', element: <LeagueConfigPage /> },
              { path: 'schedule', element: <SchedulePage /> },
              { path: 'tiers', element: <TierManagementPage /> },
              { path: 'activity', element: <ActivityPage /> },
              { path: 'standings', element: <StandingsPage /> },
              { path: 'players/:username', element: <PlayerProfilePage /> },
            ],
          },
```

- [ ] **Step 9: Run tests**

Run: `npx vitest run src/components/league src/utils/leagueNav.test.ts`
Expected: PASS (9 + 10 tests).
Run: `npx tsc --noEmit -p tsconfig.app.json` → sin errores. (Las páginas aún pintan su propio `PageHeader`: se ve doble cabecera hasta Task 4; es esperado.)

- [ ] **Step 10: Commit**

```bash
git add src/components/league src/pages/LeagueMembersPage.tsx src/App.tsx src/index.css
git commit -F <archivo con "feat: layout de liga con pestañas por fase, menú y ruta members">
```

---

### Task 4: Páginas de liga sin cabecera propia ni botones duplicados

**Files:**
- Modify: `src/pages/PoolPage.tsx`, `DraftPage.tsx`, `TeamsPage.tsx`, `SchedulePage.tsx`, `StandingsPage.tsx`, `ActivityPage.tsx`, `TierManagementPage.tsx`, `PlayerProfilePage.tsx`, `src/index.css`

**Interfaces:**
- Consumes: el layout de Task 3 (`.league-page` define `--league-tabs-h`).
- Produces: páginas que devuelven `<>…<main className="page-content">…</main>…</>` sin `page-wrapper` ni `PageHeader`.

Regla común para cada página de la lista:
1. Quitar `import PageHeader from '../components/PageHeader';`.
2. Quitar el `<div className="page-wrapper">` exterior y su `</div>` de cierre; el contenido pasa a un fragmento `<>…</>` (modales incluidos).
3. Quitar el bloque `<PageHeader … />` completo (incluido `rightExtra` en TeamsPage, ver abajo).
4. Quitar las líneas `{league && <p className="page-subtitle">{league.name}</p>}` (el nombre ya está en la barra de liga).
5. Si `navigate` / `useNavigate` o la query `league` quedan sin uso, quitarlos (y sus imports); `npx eslint <archivo>` y `tsc` lo señalan.

- [ ] **Step 1: PoolPage** — aplicar la regla común (cabecera en líneas ~111-116).

- [ ] **Step 2: DraftPage** — regla común y, dentro de `section-actions`, quitar los dos botones de navegación ("Ver equipos" y "⚙️ Configuración"); se queda solo "Cancelar draft":
```tsx
          <div className="section-actions">
            {isAdmin && draft?.status === 'IN_PROGRESS' && (
              <button className="btn-danger" onClick={() => setShowCancelModal(true)}>
                Cancelar draft
              </button>
            )}
          </div>
```

- [ ] **Step 3: TeamsPage** — regla común; el botón "Intercambios" (antes `rightExtra`) pasa junto al título. Sustituir `<h1 className="page-title">Equipos</h1>` por:
```tsx
        <div className="section-header">
          <h1 className="page-title">Equipos</h1>
          {isDraftCompleted && (
            <button
              className="btn-ghost"
              style={{ position: 'relative' }}
              onClick={() => setShowTradesModal(true)}
            >
              Intercambios
              {pendingIncomingCount > 0 && (
                <span style={{
                  position: 'absolute', top: -6, right: -6,
                  background: 'var(--accent-fill)', color: '#0a0a0f',
                  fontSize: '0.65rem', fontWeight: 700,
                  borderRadius: '50%', width: 18, height: 18,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {pendingIncomingCount}
                </span>
              )}
            </button>
          )}
        </div>
```
Y en `src/index.css`, en `.own-team-panel`, cambiar
`top: calc(60px + env(safe-area-inset-top));  /* header-inner 60px + status bar */`
por
`top: calc(60px + var(--league-tabs-h, 0px) + env(safe-area-inset-top));  /* cabecera 60px + pestañas de liga + status bar */`.

- [ ] **Step 4: SchedulePage** — regla común; en `section-actions` quitar el botón "🏆 Clasificación" (se queda el `coin-badge`).

- [ ] **Step 5: StandingsPage** — regla común; quitar el `div.section-actions` con el botón "📅 Calendario". Filas: el nombre pasa a ser un enlace real (clic central, nueva pestaña) y la fila sigue siendo clicable:
1. `import { Link, useNavigate, useParams } from 'react-router-dom';` (ajustar al import existente).
2. En `StandingRow`, añadir la prop `to: string` (tipo en la firma: `to: string;`) y, en la celda del nombre, sustituir `{row.username}` por:
```tsx
        <Link to={to} className="row-link" onClick={(e) => e.stopPropagation()}>
          {row.username}
        </Link>
```
3. En el `map`, pasar `to={`/leagues/${leagueId}/players/${row.username}`}` además del `onNavigate` actual.
4. En `src/index.css`, junto a las reglas `.picks-table`, añadir:
```css
.row-link { color: inherit; text-decoration: none; }
.row-link:hover, .row-link:focus-visible { text-decoration: underline; }
```

- [ ] **Step 6: ActivityPage** — regla común; quitar el botón "Equipos" de la cabecera de sección (se queda el indicador "Actualizando").

- [ ] **Step 7: TierManagementPage** — regla común; el botón "Volver a la liga" del estado vacío pasa a enlace:
```tsx
            <Link className="btn-ghost" to={`/leagues/${leagueId}`}>
              Volver a la liga
            </Link>
```
(`import { Link, … } from 'react-router-dom'`; si `navigate` queda sin uso, quitarlo).

- [ ] **Step 8: PlayerProfilePage** — regla común.

- [ ] **Step 9: Verificar**

Run: `npx tsc --noEmit -p tsconfig.app.json` → sin errores.
Run: `npx eslint src/pages` → 0 errores (se admiten los 2 warnings previos del repo en `api/pokemons.ts` y el de `LeagueMembersPage.tsx` heredado de `LeagueDetailPage`).
Run: `npx vitest run` → todos PASS (TeamsPage y SchedulePage siguen con su `MemoryRouter`).
Run: `grep -rn "PageHeader\|btn-back" src/pages` → solo `HomePage`, `LeaguesPage`, `MyProfilePage`, `InvitePage`.

- [ ] **Step 10: Commit**

```bash
git add src/pages src/index.css
git commit -F <archivo con "refactor: páginas de liga sin cabecera propia ni navegación duplicada">
```

---

### Task 5: Configuración bloquea cualquier salida con cambios sin guardar

**Files:**
- Modify: `src/pages/LeagueConfigPage.tsx`
- Test: `src/pages/LeagueConfigPage.test.tsx`

**Interfaces:**
- Consumes: `useBlocker` de react-router-dom (router de datos, Task 2).
- Produces: sin API nueva. `LeagueConfigPage` ya no usa `leaveTarget` ni `guardedNavigate`.

- [ ] **Step 1: Write the failing tests**

En `src/pages/LeagueConfigPage.test.tsx`:
1. Import: `import { createMemoryRouter, RouterProvider } from 'react-router-dom';` (en lugar de `MemoryRouter, Route, Routes`) y `act` de `@testing-library/react`.
2. Sustituir `renderPage` por:
```tsx
function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = createMemoryRouter([
    { path: '/leagues/:leagueId/config', element: <LeagueConfigPage /> },
    { path: '/leagues/:leagueId/teams', element: <p>Pantalla de equipos</p> },
  ], { initialEntries: ['/leagues/league-1/config'] });
  const result = render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
  return { ...result, router };
}
```
3. Añadir al final del `describe`:
```tsx
  it('con cambios sin guardar, salir pide confirmación y Descartar completa la navegación', async () => {
    const { router } = renderPage();
    const coinsPerWin = await screen.findByLabelText('Monedas por victoria');
    await userEvent.clear(coinsPerWin);
    await userEvent.type(coinsPerWin, '150');

    await act(async () => { await router.navigate('/leagues/league-1/teams'); });
    expect(await screen.findByText('Cambios sin guardar')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Descartar cambios' }));
    expect(await screen.findByText('Pantalla de equipos')).toBeInTheDocument();
  });

  it('Seguir editando cancela la salida y conserva los cambios', async () => {
    const { router } = renderPage();
    const coinsPerWin = await screen.findByLabelText('Monedas por victoria') as HTMLInputElement;
    await userEvent.clear(coinsPerWin);
    await userEvent.type(coinsPerWin, '150');

    await act(async () => { await router.navigate('/leagues/league-1/teams'); });
    await userEvent.click(await screen.findByRole('button', { name: 'Seguir editando' }));

    expect(router.state.location.pathname).toBe('/leagues/league-1/config');
    expect(coinsPerWin.value).toBe('150');
  });

  it('sin cambios se sale sin preguntar', async () => {
    const { router } = renderPage();
    await screen.findByLabelText('Monedas por victoria');
    await act(async () => { await router.navigate('/leagues/league-1/teams'); });
    expect(await screen.findByText('Pantalla de equipos')).toBeInTheDocument();
  });

  it('tras guardar se sale sin preguntar', async () => {
    const { router } = renderPage();
    const coinsPerWin = await screen.findByLabelText('Monedas por victoria');
    await userEvent.clear(coinsPerWin);
    await userEvent.type(coinsPerWin, '150');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
    await waitFor(() => expect(mockedUpdateSettings).toHaveBeenCalledTimes(1));

    await act(async () => { await router.navigate('/leagues/league-1/teams'); });
    expect(await screen.findByText('Pantalla de equipos')).toBeInTheDocument();
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/pages/LeagueConfigPage.test.tsx`
Expected: FAIL en los tests nuevos de confirmación ("Cambios sin guardar" no aparece: la navegación programática no está bloqueada) y en "tras guardar" si el refetch no ha llegado.

- [ ] **Step 3: Implementar el bloqueo**

En `src/pages/LeagueConfigPage.tsx`:
1. Import: `import { useBlocker, useParams } from 'react-router-dom';` (fuera `useNavigate`).
2. Quitar `const navigate = useNavigate();` y `const [leaveTarget, setLeaveTarget] = useState<string | null>(null);`.
3. Sustituir la función `guardedNavigate` completa por:
```tsx
  // Cualquier salida (pestañas, menú, enlaces, atrás del navegador o de Android) pasa por aquí.
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) => hasChanges && currentLocation.pathname !== nextLocation.pathname,
  );
```
4. En `onSuccess` de `save`, antes de los `invalidateQueries`, fijar lo guardado para que el formulario deje de contar como cambio sin esperar al refetch:
```tsx
    onSuccess: (_data, payload) => {
      setError('');
      setSavedAt(Date.now());
      queryClient.setQueryData(['league-settings', leagueId], payload);
      queryClient.invalidateQueries({ queryKey: ['league-settings', leagueId] });
      queryClient.invalidateQueries({ queryKey: ['closed-list', leagueId] });
    },
```
5. Sustituir el modal `{leaveTarget && ( … )}` por:
```tsx
      {blocker.state === 'blocked' && (
        <div className="modal-overlay" onClick={() => blocker.reset()}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">Cambios sin guardar</h2>
            <p style={{ color: 'var(--text-2)', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
              Tienes {pendingChanges.length} cambio{pendingChanges.length !== 1 ? 's' : ''} sin guardar.
              Si sales ahora se perderán.
            </p>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => blocker.reset()}>
                Seguir editando
              </button>
              <button className="btn-danger" onClick={() => blocker.proceed()}>
                Descartar cambios
              </button>
            </div>
          </div>
        </div>
      )}
```
6. Aplicar además la regla común de Task 4 a esta página (sin `page-wrapper`, sin `PageHeader`, sin subtítulo con el nombre).

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/pages/LeagueConfigPage.test.tsx`
Expected: PASS (9 tests).

- [ ] **Step 5: Commit**

```bash
git add src/pages/LeagueConfigPage.tsx src/pages/LeagueConfigPage.test.tsx
git commit -F <archivo con "feat: Configuración bloquea cualquier salida con cambios sin guardar (useBlocker)">
```

---

### Task 6: Enlaces reales en cabecera, Home y Mis ligas

**Files:**
- Modify: `src/components/PageHeader.tsx`, `src/pages/HomePage.tsx`, `src/pages/LeaguesPage.tsx`, `src/index.css`

**Interfaces:**
- Consumes: `FOCUS_CARDS`, `homeFocus`, `single`, `card` de `HomePage.tsx` (punto 2).
- Produces: sin API nueva.

- [ ] **Step 1: PageHeader**

En `src/components/PageHeader.tsx`: `import { Link } from 'react-router-dom';` (fuera `useNavigate` y `const navigate`). Logo por defecto:
```tsx
        {left ?? <Link className="logo" to="/">PokeFantasy</Link>}
```
Saludo:
```tsx
          <Link className="header-user" to="/profile" title="Ver mi perfil">
            Hola, <strong>{username}</strong>
          </Link>
```

- [ ] **Step 2: HomePage**

En `src/pages/HomePage.tsx`: `import { Link } from 'react-router-dom';` (fuera `useNavigate`, `navigate` y `handleFocusNav`). Calcular el destino:
```tsx
  // Una liga en esa fase → directo a su pantalla; varias → lista de ligas
  const focusTarget = single && card ? `/leagues/${single.id}${card.path}` : '/leagues';
```
Tarjeta "Mis ligas": `<button className="nav-card nav-card-gold" onClick={() => navigate('/leagues')}>` … `</button>` → `<Link className="nav-card nav-card-gold" to="/leagues">` … `</Link>`.
Tarjeta de fase: `<button className={…} onClick={handleFocusNav}>` … `</button>` → `<Link className={…} to={focusTarget}>` … `</Link>`.

- [ ] **Step 3: LeaguesPage**

En `src/pages/LeaguesPage.tsx`: la tarjeta
`<div key={league.id} className="card" onClick={() => navigate(`/leagues/${league.id}`)}>` … `</div>`
→ `<Link key={league.id} className="card" to={`/leagues/${league.id}`}>` … `</Link>`. Importar `Link`; quitar `navigate` si queda sin uso.

- [ ] **Step 4: CSS**

En `src/index.css`, tras la regla `.card:hover`:
```css
a.card, a.nav-card, a.header-user { color: inherit; text-decoration: none; }
```
(La tarjeta "Mis ligas" deja de centrar el texto, que heredaba de `<button>`: ahora se alinea igual que "Cómo funciona".)

- [ ] **Step 5: Verificar**

Run: `npx tsc --noEmit -p tsconfig.app.json && npx eslint src && npx vitest run` → sin errores, tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/PageHeader.tsx src/pages/HomePage.tsx src/pages/LeaguesPage.tsx src/index.css
git commit -F <archivo con "feat: enlaces reales en cabecera, Home y Mis ligas">
```

---

### Task 7: Verificación completa, PR y vault

**Files:**
- Modify (vault): `50 Features/Navegación de liga.md`, `50 Features/Sistema visual.md`, `40 Frontend/Revisión de diseño 2026-09.md`, `40 Frontend/Estructura frontend.md`
- Create (vault): `70 Decisiones/ADR-012 Router de datos.md` (confirmar el siguiente número libre en `70 Decisiones/`)

- [ ] **Step 1: Batería de CI**

Run: `npm run lint`, `npm test`, `npm run build` → verde.
Run `api:check` con `src/api/schema.d.ts` normalizado a LF (ver vault Gotchas) → sin diferencias; restaurar el archivo después.

- [ ] **Step 2: Revisión visual (preview en el puerto 5174, sesión iniciada por el usuario)**

Escritorio, 375 px y tema claro:
- `/leagues/:id` redirige a Equipos (liga en temporada); pestañas Equipos · Calendario · Clasificación · Actividad · Draft; activa subrayada.
- Menú ⚙: Configuración, Gestionar tiers, Miembros; se cierra con Escape y clic fuera.
- Clasificación → nombre de un jugador → perfil con Clasificación activa; clic central abre pestaña nueva.
- Equipos: el panel propio sticky queda bajo la tira de pestañas al hacer scroll.
- Configuración: editar un campo y pulsar una pestaña → modal; "Seguir editando" se queda; atrás del navegador → modal.
- 375 px: pestañas en una fila con scroll, "Cerrar sesión" en una línea.
- Consola sin errores.

- [ ] **Step 3: Push y PR**

Push de `feature/navegacion-liga` y PR contra `main` con resumen, verificación y la línea `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.

- [ ] **Step 4: Vault**

- `Navegación de liga.md`: `estado: hecho` (o `en-curso` hasta el merge), `prs_front`, tareas tachadas, sección "Implementado".
- `Revisión de diseño 2026-09.md`: tachar el punto 3 y, en el 16, la parte de navegación con `<a>` y cabecera móvil.
- `Sistema visual.md`: en iconografía, anotar la barra inferior tipo app (opción B) para cuando exista el set de iconos.
- `Estructura frontend.md`: rutas anidadas bajo `LeagueLayout`, `/members`, `components/league/`.
- ADR "Router de datos": contexto (aviso de cambios sin guardar con pestañas persistentes), decisión (`createBrowserRouter` + `useBlocker`), consecuencias (tests de páginas con `useBlocker` usan `createMemoryRouter`).
- Commit y push del vault.
