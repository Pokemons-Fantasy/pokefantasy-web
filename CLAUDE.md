# CLAUDE.md — pokefantasy-web

## Repo & Deploy

| Local path | Base branch | Deploy |
|-----------|-------------|--------|
| `C:\PokeFantasy\pokefantasy-web` | `main` | Netlify (auto on push to `main`) |

GitHub: https://github.com/Pokemons-Fantasy/pokefantasy-web

## Build commands

```bash
npm install              # install dependencies (run first if node_modules missing)
npm run dev              # dev server (Vite)
npm run build            # tsc -b && vite build (what Netlify runs)
npm run lint             # eslint
./node_modules/.bin/tsc --noEmit   # type check only (no emit)
```

No test framework configured yet.

## Stack

React 19 + Vite 8 + TypeScript 6, TanStack React Query 5, Zustand 5, Axios, React Router v7.

## Project structure

```
src/
  api/          → API clients (auth, leagues, pokemons, trades, activity)
  components/   → Shared components (modals, banners, badges)
  components/teams/ → TeamsPage-specific modals (steal, swap, bench, price, rival action)
  pages/        → Route pages (one file per page)
  store/        → Zustand stores (authStore, toastStore)
  utils/        → Helpers (sprites, tiers, errorMessage)
  index.css     → Global styles + design tokens
  App.tsx       → Router + providers
```

## Conventions

- **`import type { X }`** for pure interfaces/types. Netlify build fails without `type` keyword.
- **API base URL**: `VITE_API_URL` env var, defaults to `https://pokefantasy.onrender.com` (see `api/client.ts`).
- **Auth**: JWT in localStorage (`token` key), Zustand persisted under `auth-storage`. Axios interceptor adds Bearer header automatically.
- **Sprites**: always from CDN via `spriteUrl(id)` in `utils/sprites.ts`. Never add a backend endpoint for sprites.
- **Routing**: all league routes under `/leagues/:leagueId/*`, protected by `ProtectedRoute`.
- **Version**: `__APP_VERSION__` global defined by Vite from `package.json` version, shown bottom-right.

## Design system (index.css)

- Dark theme. Fonts: Outfit (body), Space Mono (numeric stats via `.stat-pill-value`).
- CSS custom properties: `--bg`, `--surface`, `--surface-2`, `--accent` (#fbbf24 amber), `--green`, `--red`, `--blue`, `--text`, `--text-2`, `--text-3`, `--radius`, `--radius-sm`.
- Animation classes: `.animate-in` (fadeUp 0.4s), `.stagger` (children staggered 60ms each).
- Loading: `.spinner`, `.skeleton`, `.loading-text`.
- No component library (all custom CSS).

## Git workflow

Same as backend: never push to `main` directly. Always `feature/...` or `fix/...` branch, then PR via GitHub API (snippet in backend CLAUDE.md, change repo to `pokefantasy-web` and base to `main`).

## Verificación local antes de PR

**Obligatorio antes de abrir cualquier PR.** El backend usa Render (`VITE_API_URL` defaultea a `https://pokefantasy.onrender.com`), no hay config adicional.

```bash
npm run dev   # arranca en http://localhost:5173
```

Pasos:
1. `npm run dev`
2. Navegar a las páginas afectadas por los cambios
3. Verificar visualmente que la feature funciona y no hay regresiones
4. Si hay errores en consola, corregirlos antes de pushear
5. Solo entonces: `git push` + abrir PR

**Verificar también**: nuevas interfaces TypeScript contra el shape real del API — nunca asumir el formato, comprobarlo en el response del backend antes de definir tipos.
