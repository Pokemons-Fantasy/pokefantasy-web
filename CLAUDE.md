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

## Arquitectura

### 1. Qué hay en el sistema

SPA React 19 + Vite + TypeScript, desplegada en Netlify y empaquetada como app Android con Capacitor. Habla con la API Spring Boot de Render por REST (cookies `jwt` + `refresh`) y recibe eventos por SSE (draft de la liga y notificaciones del usuario) y push FCM en Android.

```
pages/ (una por ruta) ─► components/ (UI) ─► utils/ (lógica pura) 
   │ useQuery / useMutation
   ▼
src/api/*.ts ─► apiClient (Axios, withCredentials) ─► backend
   ▲ schema.d.ts (generado) + contract.ts (comprobación de tipos)
store/ (Zustand: authStore, toastStore) · hooks/ (SSE, tema, reduced motion)
```

Rutas y estructura completa: `vault/40 Frontend/Estructura frontend.md`.

### 2. Quién es responsable de qué

| Responsabilidad | Dueño |
|---|---|
| Llamadas HTTP y tipos de request/response | `src/api/*.ts` (`auth`, `leagues`, `pokemons`, `trades`, `activity`) sobre `apiClient` |
| Tipos generados de la API / comprobación contra el backend | `src/api/schema.d.ts` (generado) / `src/api/contract.ts` |
| Estado de servidor y caché | React Query (`useQuery` / `useMutation` en páginas y componentes) |
| Usuario en sesión (solo `username`) | `store/authStore.ts` |
| Notificaciones en pantalla | `store/toastStore.ts` + `ToastContainer`; mensaje con `extractErrorMessage` |
| SSE de usuario (robo, trade propuesto) | `hooks/useNotificationSse.ts` |
| SSE del draft | `pages/DraftPage.tsx` |
| Equipos a partir de `draft.picks`, bloqueo de un pick | `utils/teams.ts` (`deriveTeams`, `isPickLocked`) |
| Sprites / colores de tipos y tiers | `utils/sprites.ts` / `utils/colors.ts` |
| Orden de tiers y precio mostrado (`tierRank`, `priceForTier`) | `utils/tiers.ts` |
| Reglas de registro / marcador | `utils/registration.ts` / `utils/score.ts` |
| Tema claro/oscuro y status bar | `hooks/useTheme.ts` |
| Registro del token push | `main.tsx` (único uso de `apiClient` fuera de `src/api/`) |

### 3. Decisiones intencionadas (no "arreglarlas")

Antes de cambiarlas, leer la nota en `vault/70 Decisiones/` y preguntar.

- **El front no guarda tokens**: sesión solo por cookies httpOnly; `authStore` persiste únicamente `username` (ADR-002, ADR-009).
- **Las ventanas de mercado no se calculan en el front**: se usan `stealWindowOpen` / `swapWindowOpen` del schedule (ADR-003).
- **Los equipos se derivan de `draft.picks`**, no de un endpoint de equipos (ADR-006).
- **El código usa los tipos escritos a mano de `src/api/*.ts`**, no `schema.d.ts` directamente; `contract.ts` comprueba en compilación que cuadran con el backend (solo campos primitivos; la nulabilidad no se compara porque springdoc no marca `required`) (ADR-010).
- **SSE + polling de respaldo**: si el `EventSource` se cierra, se vuelve a polling (10 s draft, 120 s usuario). No quitar el fallback.
- **Sin `VITE_API_URL` se apunta a producción** a propósito (build de Netlify y APK); en local se usa `.env.local`.
- **Router de datos** (`createBrowserRouter`): las subrutas de liga cuelgan de `LeagueLayout` y Configuración bloquea la salida con `useBlocker`. El error boundary global se reinicia con `resetKey`, no con `key={pathname}` (remontaría los layouts). Tests de páginas con `useBlocker`: `createMemoryRouter` (ADR-012).

### 4. Qué puede tocar qué

`pages` → `components` → `utils`; cualquiera puede leer `store` y usar `api`. Prohibido:
- Llamar a `axios` / `apiClient` / `fetch` desde páginas o componentes: toda llamada va en una función de `src/api/*.ts`.
- Editar `src/api/schema.d.ts` a mano.
- Guardar tokens o datos sensibles en `localStorage` / JS.
- Decidir en el front si una operación está permitida (ventanas, bloqueos, saldo, regla de tier) de forma distinta al backend: el front usa lo que expone la API para mostrar y deshabilitar, y el backend es quien valida.
- Lógica de negocio en componentes cuando cabe en una función pura de `utils/` (con test).
- Sprites fuera del CDN, estados de error con `useState` locales, textos "Cargando..." en vez de skeletons.

### 5. Cómo se mueven los datos

Lectura: página → `useQuery({ queryKey: ['draft-status', leagueId], queryFn: getDraftStatus })` → función de `src/api/` → backend.
Escritura: `useMutation` → función de `src/api/` → backend → `onSuccess` **invalida las queries afectadas** (p. ej. un swap invalida `draft-status`, `bench` y `my-coins`) → toast; `onError` → toast con `extractErrorMessage`.
Tiempo real: evento SSE (`draft-updated`, `steal`, `trade-proposed`) → `queryClient.invalidateQueries` de las claves afectadas → React Query refresca. Nunca se mete el payload del evento a mano en la caché.
Flujos completos (robo, pick del draft, resultado): `vault/20 Arquitectura/Flujos de datos.md`.

### 6. Qué no se puede romper nunca

- **Build de Netlify y CI en verde**: `import type` para tipos puros; `lint`, `api:check`, `test`, `build` pasan.
- **Contrato con el backend**: `schema.d.ts` y `openapi.json` al día; `contract.ts` compila.
- **Sin secretos en el repo** (`.env.local`, `android/app/google-services.json`) ni tokens en JS.
- **Compatibilidad con el backend desplegado**: campos nuevos opcionales, el front no puede depender de algo que el backend en producción aún no devuelve.
- **Una sola fuente de verdad**: equipos de `draft.picks`, ventanas del schedule, errores del `ProblemDetail`.
- **Accesibilidad y `prefers-reduced-motion`** en todo componente nuevo.
- Ningún patrón nuevo (librería de estado, cliente HTTP, sistema de estilos) sin una razón escrita en `vault/70 Decisiones/`.

### 7. Dónde va el código nuevo

| Qué | Dónde |
|---|---|
| Llamada a un endpoint | Función en el `src/api/*.ts` de su dominio + tipo manual + entrada en `contract.ts` |
| Pantalla nueva | `src/pages/XPage.tsx` + ruta en `App.tsx` (dentro de `ProtectedRoute` si requiere sesión) |
| Pieza de TeamsPage / LeagueConfigPage | `components/teams/` / `components/leagueConfig/` |
| Componente reutilizable | `src/components/` |
| Lógica pura (cálculos, formatos) | `src/utils/x.ts` + `x.test.ts` |
| Estado global de cliente | Store Zustand en `src/store/` (solo si no es estado de servidor) |
| Suscripción SSE nueva | Hook en `src/hooks/` que invalida queries |
| Estilos | Tokens en `src/index.css`; colores de tier en `utils/colors.ts` |
| Plugin nativo | `@capacitor/*` + `npm run cap:sync` (ver `vault/40 Frontend/App Android.md`) |

### 8. Cuándo parar y preguntar

Si una tarea obliga a romper una regla de las secciones 3, 4 o 6, a cambiar una decisión intencionada, o a crear una segunda forma de hacer algo que ya tiene dueño (otro cliente HTTP, otro sistema de toasts, otra forma de calcular equipos):

**PARAR** → nombrar la regla o decisión en conflicto → explicar qué afecta (pantallas, backend, app Android) → proponer el cambio más pequeño que no la rompa → esperar respuesta del usuario antes de implementar.

También parar si el cambio necesita algo que el backend no expone todavía (pedir o diseñar primero el endpoint) o toca la sesión / seguridad.

## Reglas de detalle

- **Tipos de la API** (tras cambiar un DTO, enum o endpoint en el backend):
  1. `npm run api:spec` descarga `http://localhost:8080/v3/api-docs` a `openapi.json` (o `npm run api:spec -- <url>`). El backend sirve la spec sin Mongo ni Redis con `SPRING_MAIN_LAZY_INITIALIZATION=true`.
  2. `npm run api:types` regenera `src/api/schema.d.ts`.
  3. Si `tsc` falla en `src/api/contract.ts`, un tipo escrito a mano en `src/api/*.ts` ya no cuadra con el backend: corregirlo. Tipo de respuesta nuevo → añadir su entrada en `contract.ts`.
  4. Commitear `openapi.json` y `src/api/schema.d.ts` juntos.
- **Sesión**: `apiClient` (`src/api/client.ts`) y `EventSource` usan `withCredentials: true`.
- **React Query**: `staleTime` en las queries que no cambian a menudo (Render free tier: minimizar llamadas). No pedir endpoints nuevos si los datos ya vienen en uno existente.
- **Sprites**: CDN `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/{id}.png` vía `src/utils/sprites.ts`.
- **UI compartida**: `PageHeader`, `SkeletonTable` / `SkeletonGrid`, `PokemonCard` en `components/teams/`, tokens CSS en `src/index.css`.
- **Animaciones** con Motion respetando `useReducedMotion`; modales con roles, labels y gestión del foco.
