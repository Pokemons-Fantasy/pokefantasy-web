# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Documentación: vault de Obsidian

Toda la documentación y el conocimiento del proyecto (back y front) vive en el vault **`C:\PokeFantasy\vault`**, versionado en el repo privado [`Pokemons-Fantasy/pokefantasy-vault`](https://github.com/Pokemons-Fantasy/pokefantasy-vault) (commits directos a `main`; convenciones en `vault/CLAUDE.md`, hacer `git pull` antes de editar). Este archivo solo contiene las reglas que hay que cumplir al programar el frontend.

- Punto de entrada: `vault/Home.md`. Contrato de la API (endpoint ↔ página): `20 Arquitectura/API REST.md`. Estructura y convenciones del front: `40 Frontend/`. Una nota por feature en `50 Features/`.
- Antes de tocar una feature, leer su nota. Al terminar (PR listo o mergeado), actualizar las notas afectadas: feature (`estado`, `prs_front`), API REST, `40 Frontend/`, `60 Operaciones/Gotchas.md` si hubo incidente.
- **"Añadir al roadmap"** = crear o actualizar la nota de la feature en `vault/50 Features/` desde `Plantillas/Plantilla Feature.md` con `estado: idea`. No implica implementación.
- Las reglas del backend y el flujo de PRs por API están en `C:\PokeFantasy\pokefantasy\CLAUDE.md`.
- Si una nota contradice al código, manda el código: corregir la nota.

## Repos & Deploy

| Repo | Local path | Base branch | Deploy |
|------|-----------|-------------|--------|
| Backend | `C:\PokeFantasy\pokefantasy` | `develop` | Render (auto on push to `develop`) |
| Frontend | `C:\PokeFantasy\pokefantasy-web` | `main` | Netlify (auto on push to `main`) |

## Git workflow (mandatory)

1. **Revisar PRs abiertos** en ambos repos antes de crear ramas o tocar código (snippet en el `CLAUDE.md` del backend). Si hay PRs abiertos, mencionarlos al usuario.
2. **Siempre invocar el skill `brainstorming`** antes de implementar cualquier feature nueva.
3. Never push directly to `main`: `feature/...` or `fix/...` → commit → push → PR contra `main`. No hay `gh` CLI: PRs con la API de GitHub (`$env:GITHUB_TOKEN`, cargar con `. $PROFILE` si está vacío) hacia `Pokemons-Fantasy/pokefantasy-web`.
4. Si un cambio toca back y front, el front debe tolerar el back viejo (campos opcionales) y el back no romper el front viejo: así da igual el orden de los merges.

## Comandos

```bash
npm install
npm run dev                         # sin VITE_API_URL apunta a PRODUCCIÓN (ver abajo)
./node_modules/.bin/tsc --noEmit    # check de tipos
npm run lint
npm test                            # vitest (jsdom)
npm run api:check                   # schema.d.ts coincide con openapi.json
npm run build                       # tsc -b && vite build
```

Antes de hacer push, lo mismo que la CI (`.github/workflows/ci.yml`, Node 24): `npm run lint`, `npm run api:check`, `npm test`, `npm run build`.

- **Backend local**: crear `.env.local` (no se commitea) con `VITE_API_URL=http://localhost:8080`. Sin él, `npm run dev` habla con producción.
- **Android**: `npm run cap:sync` → `npm run cap:open` → Build APK en Android Studio. `android/app/google-services.json` no se commitea. FCM no funciona en emuladores sin Google Play.

## Reglas

- **`import type { X }`** para interfaces y tipos puros: **Netlify falla si no**.
- **Tipos de la API** (tras cambiar un DTO, enum o endpoint en el backend):
  1. `npm run api:spec` descarga `http://localhost:8080/v3/api-docs` a `openapi.json` (o `npm run api:spec -- <url>`). El backend sirve la spec sin Mongo ni Redis con `SPRING_MAIN_LAZY_INITIALIZATION=true`.
  2. `npm run api:types` regenera `src/api/schema.d.ts` (**no editar a mano**).
  3. Si `tsc` falla en `src/api/contract.ts`, un tipo escrito a mano en `src/api/*.ts` ya no cuadra con el backend: corregirlo. Tipo de respuesta nuevo → añadir su entrada en `contract.ts`.
  4. Commitear `openapi.json` y `src/api/schema.d.ts` juntos.
- **Sesión**: cookies httpOnly gestionadas por el backend (JWT + refresh). `apiClient` (`src/api/client.ts`) y `EventSource` usan `withCredentials: true`; `authStore` solo persiste `username`. No guardar tokens en JS.
- **Estado de servidor** con React Query y `staleTime` (Render free tier: minimizar llamadas). No pedir endpoints nuevos si los datos ya vienen en uno existente.
- **Equipos**: se derivan de `draft.picks`. **Ventanas de mercado**: usar `stealWindowOpen` / `swapWindowOpen` del schedule, nunca recalcular fechas en el front.
- **Sprites** siempre desde el CDN (`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/{id}.png`, helpers en `src/utils/sprites.ts`).
- **Errores**: toasts (`toastStore` + `ToastContainer`) con `extractErrorMessage` (lee `message` del `ProblemDetail`). No `useState` de error por componente.
- **UI compartida**: `PageHeader`, `SkeletonTable` / `SkeletonGrid` (nada de "Cargando..."), `PokemonCard` en `components/teams/`, colores de tier en `src/utils/colors.ts`, tokens CSS en `src/index.css`.
- **Animaciones** con Motion respetando `useReducedMotion`. Mantener la accesibilidad de modales (roles, labels, foco).
