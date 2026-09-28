# Foto de perfil (frontend) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Desde Mi perfil el usuario elige una foto, la encuadra en un marco circular (arrastrar + zoom/pinch), la guarda o la quita; su foto sustituye a la inicial en todas las vistas de liga.

**Architecture:** `react-easy-crop` da el encuadre; un canvas genera un JPEG de 256x256 que se sube con `PUT /v1/user/avatar`. Un componente único `UserAvatar` pinta `<img src=/v1/users/{u}/avatar?v={version}>` o la inicial. Las versiones de los miembros llegan en `league-detail`; `LeagueLayout` las publica en un contexto (`AvatarVersionsContext`) para que cualquier componente de liga pinte avatares sin prop drilling ni peticiones extra. Mi perfil usa `GET /v1/user/me`.

**Tech Stack:** React 19 + TypeScript + Vite, React Query 5, Zustand (toasts), Axios, `react-easy-crop` 6.2.3 (peer `react >=16.4.0`), Vitest 4 + Testing Library + user-event 14.

**Spec:** Diseño aprobado en chat el 2026-09-28 (sin design doc por preferencia del usuario); resumen en `pokefantasy/docs/superpowers/plans/2026-09-28-foto-de-perfil-backend.md` ("Diseño aprobado"). Este plan **depende del backend** de ese plan (contrato HTTP en su Task 4).

## Global Constraints

- Reglas de `pokefantasy-web/CLAUDE.md`: llamadas HTTP solo en `src/api/*.ts`; tipos escritos a mano + entrada en `contract.ts`; `import type` para tipos; nunca editar `schema.d.ts` a mano; lógica pura en `utils/` con test; errores con `extractErrorMessage`; toasts con `useToastStore().addToast(type, message)`.
- Compatibilidad con el backend desplegado: `avatarVersion` es **opcional** (`?: number | null`). Si falta, se pinta la inicial y no se pide nada.
- Contrato del backend: `PUT /v1/user/avatar` multipart con parte `file` → `{ avatarVersion: number }`; `DELETE /v1/user/avatar` → 204; `GET /v1/users/{username}/avatar?v={version}` → `image/jpeg`; `GET /v1/user/me` → `{ username, avatarVersion }`; `LeagueMember.avatarVersion`.
- Imagen subida: JPEG **256x256**, calidad **0.85**, fondo blanco (las zonas transparentes de un PNG no quedan negras). Foto original aceptada en el editor: `image/*` y **≤ 15 MB**.
- URL de la foto: `${API_BASE_URL}/v1/users/{username}/avatar?v={version}` (`API_BASE_URL` de `src/api/client.ts`: `/api` en la web, Render en la app nativa).
- Accesibilidad: el avatar es decorativo (`alt=""` / `aria-hidden`), el nombre siempre va al lado. El modal tiene `role="dialog"`, `aria-modal`, `aria-labelledby`, se cierra con Escape y devuelve el foco al botón que lo abrió.
- La inicial se pinta con CSS (`data-initial` + `::before`), así no cambia el `textContent` de las filas (los tests existentes buscan nombres por texto).
- Antes del PR, lo mismo que la CI: `npm run lint`, `npm run api:check`, `npm test`, `npm run build`.
- Commits en PowerShell con here-string `$msg = @'...'@`, sin rutas con `/` en el mensaje, terminando en `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **Foto que el navegador no sabe decodificar (HEIC de iPhone en Chrome/Android, fichero corrupto)**: el editor muestra "No se puede abrir esta imagen" y no deja guardar; nada de un recorte negro. Test: `AvatarEditorModal.test` "shows an error when the image cannot be decoded".
2. **Fichero que no es imagen o de más de 15 MB**: toast de error y el editor no se abre; elegir otra vez el mismo fichero vuelve a disparar el cambio. Tests: `avatarFile.test` (límite exacto de 15 MB) y `ProfilePhotoSection.test` "rejects a non-image file".
3. **Backend antiguo o usuario sin foto (`avatarVersion` ausente o `null`)**: inicial y ninguna petición de imagen. Test: `UserAvatar.test` "renders the initial and no image without a version".
4. **La imagen falla al cargar (404 tras quitar la foto en otro dispositivo, sesión caducada)**: vuelve a la inicial en vez de un icono roto. Test: `UserAvatar.test` "falls back to the initial when the image fails".
5. **Tras guardar o quitar, todas las vistas se actualizan sin recargar**: se invalidan `['me']` y `['league-detail']` (todas las ligas). Tests: `AvatarEditorModal.test` "saves the cropped JPEG…" y `ProfilePhotoSection.test` "removes the photo after confirming".

---

## File Structure

| Fichero | Acción | Responsabilidad |
|---|---|---|
| `package.json` / `package-lock.json` | Modificar | Dependencia `react-easy-crop` |
| `openapi.json`, `src/api/schema.d.ts` | Regenerar | Tipos del backend nuevo |
| `src/api/auth.ts` | Modificar | `getMe`, `uploadAvatar`, `deleteAvatar`, `avatarUrl`, tipos `CurrentUser`, `AvatarVersionResponse` |
| `src/api/auth.test.ts` | Crear | Tests de `avatarUrl` y `uploadAvatar` |
| `src/api/leagues.ts` | Modificar | `LeagueMember.avatarVersion` |
| `src/api/contract.ts` | Modificar | Entradas de los tipos nuevos |
| `src/components/avatar/AvatarVersionsContext.ts` | Crear | Contexto username → versión + `useAvatarVersion` |
| `src/components/avatar/UserAvatar.tsx` (+ `.test.tsx`) | Crear | Foto o inicial |
| `src/components/league/LeagueLayout.tsx` | Modificar | Provee el contexto a las páginas de liga |
| `src/index.css` | Modificar | Estilos de avatar, editor y sección |
| `src/pages/LeagueMembersPage.tsx`, `src/components/teams/OwnTeamPanel.tsx`, `src/components/teams/RivalTeamsList.tsx`, `src/pages/StandingsPage.tsx`, `src/components/schedule/MatchRow.tsx`, `src/pages/ActivityPage.tsx`, `src/pages/PlayerProfilePage.tsx`, `src/components/draft/DraftBoard.tsx`, `src/components/TradesModal.tsx` | Modificar | Usar `UserAvatar` |
| `src/utils/avatarFile.ts` (+ `.test.ts`) | Crear | Validar el fichero elegido, estilo de la vista previa |
| `src/components/avatar/cropImage.ts` | Crear | Cargar la imagen y recortarla a JPEG con canvas |
| `src/components/avatar/AvatarEditorModal.tsx` (+ `.test.tsx`) | Crear | Editor de encuadre y guardado |
| `src/components/avatar/ProfilePhotoSection.tsx` (+ `.test.tsx`) | Crear | Subir / cambiar / quitar en Mi perfil |
| `src/pages/MyProfilePage.tsx` | Modificar | Hero con foto + sección nueva |

---

### Task 0: Rama aislada

El checkout `C:\PokeFantasy\pokefantasy-web` está en `docs/claude-md-architecture` con borrados sin commitear en `docs/superpowers/`. **No tocarlo**: worktree.

- [ ] **Step 1: Revisar PRs abiertos** en ambos repos (snippet del `CLAUDE.md` del backend). Si hay alguno, avisar al usuario.

- [ ] **Step 2: Comprobar que el PR del backend existe** (plan backend, Task 5). La regeneración de tipos (Task 1) necesita el backend de la rama `feature/foto-de-perfil` corriendo en local.

- [ ] **Step 3: Crear el worktree desde `origin/main`**

```powershell
cd C:\PokeFantasy\pokefantasy-web
git fetch origin
git worktree add ..\pokefantasy-web-avatar -b feature/foto-de-perfil origin/main
cd ..\pokefantasy-web-avatar
New-Item -ItemType Directory -Force docs\superpowers\plans | Out-Null
Copy-Item ..\pokefantasy-web\docs\superpowers\plans\2026-09-28-foto-de-perfil-frontend.md docs\superpowers\plans\
npm ci
npm test
```

Expected: tests en verde. Todas las rutas siguientes son relativas a `C:\PokeFantasy\pokefantasy-web-avatar`.

- [ ] **Step 4: Commit del plan**

```powershell
git add docs\superpowers\plans\2026-09-28-foto-de-perfil-frontend.md
$msg = @'
docs: plan de foto de perfil (frontend)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
'@
git commit -m $msg
```

---

### Task 1: Capa de API, tipos y dependencia

**Files:**
- Modify: `package.json`, `package-lock.json`
- Regenerate: `openapi.json`, `src/api/schema.d.ts`
- Modify: `src/api/auth.ts`, `src/api/leagues.ts`, `src/api/contract.ts`
- Test: `src/api/auth.test.ts`

**Interfaces:**
- Produces:
  - `interface CurrentUser { username: string; avatarVersion?: number | null }`
  - `interface AvatarVersionResponse { avatarVersion: number }`
  - `getMe(): Promise<CurrentUser>`
  - `uploadAvatar(image: Blob): Promise<number>` (devuelve la versión nueva)
  - `deleteAvatar(): Promise<void>`
  - `avatarUrl(username: string, version: number): string`
  - `LeagueMember.avatarVersion?: number | null`

- [ ] **Step 1: Instalar la dependencia**

```powershell
npm install react-easy-crop@^6.2.3
```

Expected: `package.json` con `"react-easy-crop": "^6.2.3"` en `dependencies`, sin avisos de peer (`react >=16.4.0`).

- [ ] **Step 2: Test que falla** — `src/api/auth.test.ts`

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiClient } from './client';
import { avatarUrl, uploadAvatar } from './auth';

vi.mock('./client', () => ({
  API_BASE_URL: '/api',
  apiClient: { put: vi.fn(), get: vi.fn(), delete: vi.fn(), post: vi.fn() },
}));
const mockedPut = vi.mocked(apiClient.put);

describe('avatar api', () => {
  beforeEach(() => mockedPut.mockReset());

  it('builds a versioned avatar url on the api base', () => {
    expect(avatarUrl('ash', 42)).toBe('/api/v1/users/ash/avatar?v=42');
  });

  it('encodes the username', () => {
    expect(avatarUrl('a b', 1)).toBe('/api/v1/users/a%20b/avatar?v=1');
  });

  it('uploads the image as multipart and returns the new version', async () => {
    mockedPut.mockResolvedValue({ data: { avatarVersion: 7 } });
    const image = new Blob(['jpeg'], { type: 'image/jpeg' });

    await expect(uploadAvatar(image)).resolves.toBe(7);

    const [url, body, config] = mockedPut.mock.calls[0];
    expect(url).toBe('/v1/user/avatar');
    expect(body).toBeInstanceOf(FormData);
    expect((body as FormData).get('file')).toBeInstanceOf(Blob);
    expect(config?.headers).toEqual({ 'Content-Type': 'multipart/form-data' });
  });
});
```

- [ ] **Step 3: Ejecutar y ver que falla**

Run: `npx vitest run src/api/auth.test.ts`
Expected: FAIL (`avatarUrl` / `uploadAvatar` no existen).

- [ ] **Step 4: Implementar en `src/api/auth.ts`** — cambiar el import a `import { apiClient, API_BASE_URL } from './client';` y añadir al final:

```ts
export interface CurrentUser {
  username: string;
  /** Versión de la foto de perfil; null o ausente = sin foto. */
  avatarVersion?: number | null;
}

export interface AvatarVersionResponse {
  avatarVersion: number;
}

export const getMe = async (): Promise<CurrentUser> => {
  const { data } = await apiClient.get<CurrentUser>('/v1/user/me');
  return data;
};

/** Sube la foto ya recortada (JPEG) y devuelve su versión nueva. Sustituye a la anterior. */
export const uploadAvatar = async (image: Blob): Promise<number> => {
  const form = new FormData();
  form.append('file', image, 'avatar.jpg');
  // El cliente manda JSON por defecto, y con ese Content-Type Axios convertiría el FormData a JSON.
  // Con multipart, el navegador pone el boundary.
  const { data } = await apiClient.put<AvatarVersionResponse>('/v1/user/avatar', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data.avatarVersion;
};

export const deleteAvatar = async (): Promise<void> => {
  await apiClient.delete('/v1/user/avatar');
};

/** URL de la foto de un usuario. La versión va en la URL: cada foto se cachea como inmutable. */
export const avatarUrl = (username: string, version: number): string =>
  `${API_BASE_URL}/v1/users/${encodeURIComponent(username)}/avatar?v=${version}`;
```

- [ ] **Step 5: Ejecutar el test**

Run: `npx vitest run src/api/auth.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 6: `LeagueMember` en `src/api/leagues.ts`**

```ts
export interface LeagueMember {
  username: string;
  leagueRole: 'ADMIN' | 'USER';
  /** Versión de su foto de perfil; null o ausente = sin foto. */
  avatarVersion?: number | null;
}
```

- [ ] **Step 7: Regenerar los tipos contra el backend nuevo**

Arrancar el backend del worktree `C:\PokeFantasy\pokefantasy-avatar` (rama `feature/foto-de-perfil`) como indica `vault/60 Operaciones/Entorno local.md`, con `SPRING_MAIN_LAZY_INITIALIZATION=true` (sirve la spec sin Mongo ni Redis). Después:

```powershell
npm run api:spec
npm run api:types
```

Expected: `openapi.json` y `src/api/schema.d.ts` contienen `CurrentUserResponse`, `AvatarVersionResponse`, `avatarVersion` en `LeagueMemberResponse` y las rutas `/v1/user/avatar`, `/v1/user/me`, `/v1/users/{username}/avatar`.

- [ ] **Step 8: Entradas en `src/api/contract.ts`**

Cambiar el import de `./auth` a:

```ts
import type { AvatarVersionResponse, CurrentUser, LoginResponse } from './auth';
```

y añadir, tras la línea de `LoginResponse`:

```ts
  Assert<FieldsMatch<CurrentUser, S['CurrentUserResponse']>>,
  Assert<FieldsMatch<AvatarVersionResponse, S['AvatarVersionResponse']>>,
```

- [ ] **Step 9: Comprobar tipos y contrato**

Run: `./node_modules/.bin/tsc --noEmit ; npm run api:check`
Expected: sin errores.

- [ ] **Step 10: Commit**

```powershell
git add package.json package-lock.json openapi.json src\api
$msg = @'
feat: api de foto de perfil y usuario actual

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
'@
git commit -m $msg
```

---

### Task 2: `UserAvatar` y contexto de versiones en las ligas

**Files:**
- Create: `src/components/avatar/AvatarVersionsContext.ts`
- Create: `src/components/avatar/UserAvatar.tsx`
- Test: `src/components/avatar/UserAvatar.test.tsx`
- Modify: `src/components/league/LeagueLayout.tsx`
- Modify: `src/index.css`

**Interfaces:**
- Consumes: `avatarUrl` (Task 1), `LeagueMember.avatarVersion`.
- Produces:
  - `AvatarVersionsContext: React.Context<ReadonlyMap<string, number | null>>`
  - `useAvatarVersion(username: string): number | null`
  - `UserAvatar` (default export) con props `{ username: string; size?: number /* px, def. 38 */; avatarVersion?: number | null; className?: string }`. Si `avatarVersion` es `undefined` se usa el contexto; `null` fuerza la inicial.
  - Clases CSS: `member-avatar-img`, `member-avatar-hero`, `avatar-inline`.

- [ ] **Step 1: Test que falla** — `src/components/avatar/UserAvatar.test.tsx`

```tsx
import { describe, it, expect } from 'vitest';
import { fireEvent, render } from '@testing-library/react';
import UserAvatar from './UserAvatar';
import { AvatarVersionsContext } from './AvatarVersionsContext';

describe('UserAvatar', () => {
  it('renders the initial and no image without a version', () => {
    const { container } = render(<UserAvatar username="ash" />);

    expect(container.querySelector('img')).toBeNull();
    const initial = container.querySelector('.member-avatar');
    expect(initial).toHaveAttribute('data-initial', 'a');
    expect(initial).toHaveAttribute('aria-hidden', 'true');
    expect(initial?.textContent).toBe('');
  });

  it('renders the versioned photo when given a version', () => {
    const { container } = render(<UserAvatar username="ash" avatarVersion={42} size={64} />);

    const img = container.querySelector('img');
    expect(img).toHaveAttribute('src', '/api/v1/users/ash/avatar?v=42');
    expect(img).toHaveAttribute('alt', '');
    expect(img).toHaveAttribute('width', '64');
  });

  it('takes the version from the league context', () => {
    const { container } = render(
      <AvatarVersionsContext.Provider value={new Map([['misty', 7]])}>
        <UserAvatar username="misty" />
      </AvatarVersionsContext.Provider>,
    );

    expect(container.querySelector('img')).toHaveAttribute('src', '/api/v1/users/misty/avatar?v=7');
  });

  it('an explicit null wins over the context', () => {
    const { container } = render(
      <AvatarVersionsContext.Provider value={new Map([['misty', 7]])}>
        <UserAvatar username="misty" avatarVersion={null} />
      </AvatarVersionsContext.Provider>,
    );

    expect(container.querySelector('img')).toBeNull();
  });

  it('falls back to the initial when the image fails', () => {
    const { container } = render(<UserAvatar username="ash" avatarVersion={42} />);

    fireEvent.error(container.querySelector('img')!);

    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('.member-avatar')).toHaveAttribute('data-initial', 'a');
  });

  it('tries again when the version changes after a failure', () => {
    const { container, rerender } = render(<UserAvatar username="ash" avatarVersion={1} />);
    fireEvent.error(container.querySelector('img')!);

    rerender(<UserAvatar username="ash" avatarVersion={2} />);

    expect(container.querySelector('img')).toHaveAttribute('src', '/api/v1/users/ash/avatar?v=2');
  });
});
```

(`API_BASE_URL` vale `/api` en los tests: no hay `VITE_API_URL` y Capacitor no es nativo en jsdom.)

- [ ] **Step 2: Ejecutar y ver que falla**

Run: `npx vitest run src/components/avatar/UserAvatar.test.tsx`
Expected: FAIL (módulos no existen).

- [ ] **Step 3: Implementar el contexto** — `src/components/avatar/AvatarVersionsContext.ts`

```ts
import { createContext, useContext } from 'react';

/**
 * Versión de la foto de cada miembro de la liga abierta. La rellena `LeagueLayout` a partir de
 * `league-detail`, así cualquier componente de liga pinta avatares sin pedir nada más.
 */
export const AvatarVersionsContext = createContext<ReadonlyMap<string, number | null>>(new Map());

export function useAvatarVersion(username: string): number | null {
  return useContext(AvatarVersionsContext).get(username) ?? null;
}
```

- [ ] **Step 4: Implementar `UserAvatar`** — `src/components/avatar/UserAvatar.tsx`

```tsx
import { useState } from 'react';
import { avatarUrl } from '../../api/auth';
import { useAvatarVersion } from './AvatarVersionsContext';

interface UserAvatarProps {
  username: string;
  /** Diámetro en px. */
  size?: number;
  /** Versión de la foto. Sin ella se usa la de la liga abierta; `null` fuerza la inicial. */
  avatarVersion?: number | null;
  className?: string;
}

/**
 * Foto de perfil redonda; sin foto, o si no carga, la inicial. Es decorativa: el nombre del jugador
 * siempre va al lado. La inicial se pinta por CSS (`data-initial`) para no mezclarse con el texto.
 */
export default function UserAvatar({ username, size = 38, avatarVersion, className = '' }: UserAvatarProps) {
  const leagueVersion = useAvatarVersion(username);
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const version = avatarVersion !== undefined ? avatarVersion : leagueVersion;
  const src = version != null ? avatarUrl(username, version) : null;
  const style = { width: size, height: size, fontSize: Math.round(size * 0.42) };

  if (src && src !== failedSrc) {
    return (
      <img
        className={`member-avatar member-avatar-img ${className}`.trim()}
        src={src}
        alt=""
        width={size}
        height={size}
        loading="lazy"
        decoding="async"
        style={style}
        onError={() => setFailedSrc(src)}
      />
    );
  }
  return (
    <span
      className={`member-avatar ${className}`.trim()}
      data-initial={username.charAt(0)}
      aria-hidden="true"
      style={style}
    />
  );
}
```

- [ ] **Step 5: Estilos** — en `src/index.css`, justo después del bloque `.member-avatar { ... }`:

```css
.member-avatar[data-initial]::before { content: attr(data-initial); }
.member-avatar-img { object-fit: cover; padding: 0; }
.member-avatar-hero {
  background: var(--accent-dim);
  border: 2px solid var(--accent);
  font-weight: 800;
}
/* Avatar pequeño delante de un nombre en una línea de texto (tablas, marcadores, trades). */
.avatar-inline {
  display: inline-flex;
  vertical-align: middle;
  margin-right: 0.4rem;
  border-width: 0;
}
```

- [ ] **Step 6: Ejecutar el test**

Run: `npx vitest run src/components/avatar/UserAvatar.test.tsx`
Expected: PASS (6 tests).

- [ ] **Step 7: Proveer el contexto en `LeagueLayout`**

En `src/components/league/LeagueLayout.tsx`: añadir `import { useMemo } from 'react';` y `import { AvatarVersionsContext } from '../avatar/AvatarVersionsContext';`. Tras las dos `useQuery`:

```tsx
  // Versión de la foto de cada miembro para los avatares de las páginas de la liga.
  const avatarVersions = useMemo(
    () => new Map(league?.members.map((m) => [m.username, m.avatarVersion ?? null] as const) ?? []),
    [league],
  );
```

y sustituir `<Outlet />` por:

```tsx
          <AvatarVersionsContext.Provider value={avatarVersions}>
            <Outlet />
          </AvatarVersionsContext.Provider>
```

- [ ] **Step 8: Tests de la carpeta**

Run: `npx vitest run src/components`
Expected: PASS (incluido `LeagueLayout.test.tsx`).

- [ ] **Step 9: Commit**

```powershell
git add src\components\avatar src\components\league\LeagueLayout.tsx src\index.css
$msg = @'
feat: componente UserAvatar y versiones de foto por liga

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
'@
git commit -m $msg
```

---

### Task 3: Avatar en todas las vistas de liga

**Files (todas Modify):** `src/pages/LeagueMembersPage.tsx`, `src/components/teams/OwnTeamPanel.tsx`, `src/components/teams/RivalTeamsList.tsx`, `src/pages/StandingsPage.tsx`, `src/components/schedule/MatchRow.tsx`, `src/pages/ActivityPage.tsx`, `src/pages/PlayerProfilePage.tsx`, `src/components/draft/DraftBoard.tsx`, `src/components/TradesModal.tsx`

**Interfaces:**
- Consumes: `UserAvatar` (Task 2). Todas estas vistas se renderizan dentro de `LeagueLayout`, así que no hace falta pasar la versión.

En cada fichero, añadir el import de `UserAvatar` con la ruta relativa correcta (`../components/avatar/UserAvatar` desde `pages/`, `../avatar/UserAvatar` desde `components/teams|schedule|draft/`, `./avatar/UserAvatar` desde `components/`).

- [ ] **Step 1: `LeagueMembersPage.tsx`**

```tsx
              <div className="member-avatar">{m.username[0]}</div>
```
→
```tsx
              <UserAvatar username={m.username} />
```

y

```tsx
                  <div className="member-avatar" style={{ width: 32, height: 32, fontSize: '0.8rem' }}>
                    {player[0]}
                  </div>
```
→
```tsx
                  <UserAvatar username={player} size={32} />
```

- [ ] **Step 2: `OwnTeamPanel.tsx`**

```tsx
          <div className="member-avatar">{team.username[0]}</div>
```
→
```tsx
          <UserAvatar username={team.username} />
```

- [ ] **Step 3: `RivalTeamsList.tsx`**

```tsx
                <span className="member-avatar" aria-hidden="true">{team.username[0]}</span>
```
→
```tsx
                <UserAvatar username={team.username} />
```

- [ ] **Step 4: `StandingsPage.tsx`** (celda del nombre)

```tsx
        <Link to={to} className="row-link" onClick={(e) => e.stopPropagation()}>
          {row.username}
        </Link>
```
→
```tsx
        <Link to={to} className="row-link" onClick={(e) => e.stopPropagation()}>
          <UserAvatar username={row.username} size={24} className="avatar-inline" />
          {row.username}
        </Link>
```

- [ ] **Step 5: `MatchRow.tsx`**

```tsx
  function playerName(player: string) {
    return <>{completed && match.winnerUsername === player && '✓ '}{player}</>;
  }
```
→
```tsx
  function playerName(player: string) {
    return (
      <>
        {completed && match.winnerUsername === player && '✓ '}
        <UserAvatar username={player} size={20} className="avatar-inline" />
        {player}
      </>
    );
  }
```

- [ ] **Step 6: `ActivityPage.tsx`** (`EventCard`): justo antes del comentario `{/* Text */}`:

```tsx
      <UserAvatar username={event.actorUsername} size={28} />
```

- [ ] **Step 7: `PlayerProfilePage.tsx`** (hero): sustituir el `<div style={{ width: 64, height: 64, borderRadius: '50%', ... }}>{username?.[0]?.toUpperCase()}</div>` completo (desde `<div style={{` hasta su `</div>`, justo antes de `<div>` con el `<h1>`) por:

```tsx
          <UserAvatar username={username ?? ''} size={64} className="member-avatar-hero" />
```

- [ ] **Step 8: `DraftBoard.tsx`** (cabecera de columnas)

```tsx
                {player}
              </th>
```
→
```tsx
                <UserAvatar username={player} size={20} className="avatar-inline" />
                {player}
              </th>
```

- [ ] **Step 9: `TradesModal.tsx`**

```tsx
                      label={<><strong>{trade.proposer}</strong> te propone:</>}
```
→
```tsx
                      label={<><UserAvatar username={trade.proposer} size={20} className="avatar-inline" /><strong>{trade.proposer}</strong> te propone:</>}
```

y

```tsx
                      label={<>Propuesta a <strong>{trade.responder}</strong>:</>}
```
→
```tsx
                      label={<>Propuesta a <UserAvatar username={trade.responder} size={20} className="avatar-inline" /><strong>{trade.responder}</strong>:</>}
```

- [ ] **Step 10: Tipos, lint y tests existentes**

Run: `./node_modules/.bin/tsc --noEmit ; npm run lint ; npm test`
Expected: todo en verde. Los tests de `TeamsPage`, `SchedulePage`, `DraftBoard` y `LeagueLayout` no cambian: la inicial va en `data-initial` (sin texto) y el avatar tiene `aria-hidden`/`alt=""`, así que no altera ni el texto ni los nombres accesibles.

- [ ] **Step 11: Revisión visual** con el backend local (`.env.local` con `VITE_API_URL=http://localhost:8080`, `npm run dev`): con un usuario con foto y otro sin ella, revisar Miembros, Equipos, Clasificación, Calendario, Actividad, Draft, perfil de jugador y trades en claro/oscuro y a 375 px de ancho. La inicial debe verse igual que antes.

- [ ] **Step 12: Commit**

```powershell
git add src
$msg = @'
feat: foto de perfil en las vistas de liga

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
'@
git commit -m $msg
```

---

### Task 4: Validación del fichero, vista previa y recorte

**Files:**
- Create: `src/utils/avatarFile.ts`
- Test: `src/utils/avatarFile.test.ts`
- Create: `src/components/avatar/cropImage.ts`

**Interfaces:**
- Produces:
  - `MAX_AVATAR_SOURCE_BYTES = 15 * 1024 * 1024`
  - `avatarFileError(file: File): string | null`
  - `previewImageStyle(area: { x: number; y: number; width: number }): { width: string; transform: string }` (área en % de la imagen, como el primer argumento de `onCropComplete`)
  - `AVATAR_SIZE = 256`
  - `loadImage(src: string): Promise<HTMLImageElement>`
  - `cropToJpeg(image: HTMLImageElement, area: Area): Promise<Blob>` (área en px de la imagen original, el segundo argumento de `onCropComplete`)

- [ ] **Step 1: Test que falla** — `src/utils/avatarFile.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { MAX_AVATAR_SOURCE_BYTES, avatarFileError, previewImageStyle } from './avatarFile';

function fileOf(type: string, size: number): File {
  const file = new File(['x'], 'photo', { type });
  Object.defineProperty(file, 'size', { value: size });
  return file;
}

describe('avatarFileError', () => {
  it('accepts any image up to the limit', () => {
    expect(avatarFileError(fileOf('image/jpeg', 1000))).toBeNull();
    expect(avatarFileError(fileOf('image/png', MAX_AVATAR_SOURCE_BYTES))).toBeNull();
  });

  it('rejects files that are not images', () => {
    expect(avatarFileError(fileOf('application/pdf', 1000))).toMatch(/imagen/);
    expect(avatarFileError(fileOf('', 1000))).toMatch(/imagen/);
  });

  it('rejects images over 15 MB', () => {
    expect(avatarFileError(fileOf('image/jpeg', MAX_AVATAR_SOURCE_BYTES + 1))).toMatch(/15 MB/);
  });
});

describe('previewImageStyle', () => {
  it('scales the image so the cropped area fills the preview', () => {
    expect(previewImageStyle({ x: 10, y: 20, width: 50 })).toEqual({
      width: '200%',
      transform: 'translate(-10%, -20%)',
    });
  });

  it('shows the whole image when nothing is cropped', () => {
    expect(previewImageStyle({ x: 0, y: 0, width: 100 })).toEqual({
      width: '100%',
      transform: 'translate(-0%, -0%)',
    });
  });
});
```

- [ ] **Step 2: Ejecutar y ver que falla**

Run: `npx vitest run src/utils/avatarFile.test.ts`
Expected: FAIL (módulo no existe).

- [ ] **Step 3: Implementar** — `src/utils/avatarFile.ts`

```ts
/** Tamaño máximo de la foto original que se deja abrir en el editor (las de móvil rondan 3-8 MB). */
export const MAX_AVATAR_SOURCE_BYTES = 15 * 1024 * 1024;

/** Mensaje de error si el fichero no sirve como foto de perfil; null si vale. */
export function avatarFileError(file: File): string | null {
  if (!file.type.startsWith('image/')) return 'Elige una imagen (JPG, PNG, WebP...).';
  if (file.size > MAX_AVATAR_SOURCE_BYTES) return 'La imagen no puede pasar de 15 MB.';
  return null;
}

/**
 * Estilo de la `<img>` de la vista previa (dentro de un contenedor cuadrado con `overflow: hidden`)
 * para que se vea solo el área recortada. `area` va en % de la imagen: el ancho escala la imagen y el
 * `translate` (en % del propio tamaño de la imagen) la desplaza hasta el origen del recorte.
 */
export function previewImageStyle(area: { x: number; y: number; width: number }): { width: string; transform: string } {
  return {
    width: `${(100 / area.width) * 100}%`,
    transform: `translate(-${area.x}%, -${area.y}%)`,
  };
}
```

- [ ] **Step 4: Ejecutar el test**

Run: `npx vitest run src/utils/avatarFile.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Recorte con canvas** — `src/components/avatar/cropImage.ts` (sin test unitario: jsdom no implementa canvas; se cubre mockeado en Task 5 y a mano en Task 7)

```ts
import type { Area } from 'react-easy-crop';

/** Lado en px de la foto que se sube (el backend acepta hasta 512). */
export const AVATAR_SIZE = 256;
const JPEG_QUALITY = 0.85;

/** Carga una imagen (object URL del fichero elegido). Falla si el navegador no sabe decodificarla (p. ej. HEIC). */
export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('No se puede abrir esta imagen'));
    image.src = src;
  });
}

/** Recorta `area` (px de la imagen original) y la reduce a un JPEG cuadrado de AVATAR_SIZE. */
export function cropToJpeg(image: HTMLImageElement, area: Area): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = AVATAR_SIZE;
  canvas.height = AVATAR_SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) return Promise.reject(new Error('Este navegador no permite recortar imágenes'));
  // JPEG no tiene transparencia: sin fondo, las zonas transparentes de un PNG saldrían negras.
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, AVATAR_SIZE, AVATAR_SIZE);
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(image, area.x, area.y, area.width, area.height, 0, 0, AVATAR_SIZE, AVATAR_SIZE);
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('No se pudo generar la imagen'))),
      'image/jpeg',
      JPEG_QUALITY,
    );
  });
}
```

- [ ] **Step 6: Tipos y lint**

Run: `./node_modules/.bin/tsc --noEmit ; npm run lint`
Expected: sin errores.

- [ ] **Step 7: Commit**

```powershell
git add src\utils\avatarFile.ts src\utils\avatarFile.test.ts src\components\avatar\cropImage.ts
$msg = @'
feat: validacion, vista previa y recorte de la foto de perfil

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
'@
git commit -m $msg
```

---

### Task 5: Editor de encuadre

**Files:**
- Create: `src/components/avatar/AvatarEditorModal.tsx`
- Test: `src/components/avatar/AvatarEditorModal.test.tsx`
- Modify: `src/index.css`

**Interfaces:**
- Consumes: `uploadAvatar` (Task 1), `previewImageStyle` (Task 4), `loadImage`, `cropToJpeg` (Task 4), `Cropper` de `react-easy-crop` (`import Cropper from 'react-easy-crop'`, `import type { Area, Point } from 'react-easy-crop'`).
- Produces: `AvatarEditorModal` (default export) con props `{ file: File; onClose: () => void }`. Al guardar con éxito invalida `['me']` y `['league-detail']`, muestra un toast y llama a `onClose`.

- [ ] **Step 1: Test que falla** — `src/components/avatar/AvatarEditorModal.test.tsx`

```tsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useEffect } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AvatarEditorModal from './AvatarEditorModal';
import * as authApi from '../../api/auth';
import * as cropImage from './cropImage';
import { useToastStore } from '../../store/toastStore';

const PIXELS = { x: 10, y: 20, width: 300, height: 300 };

vi.mock('react-easy-crop', () => ({
  default: function CropperMock({ onCropComplete }: {
    onCropComplete: (a: object, p: object) => void;
  }) {
    useEffect(() => {
      onCropComplete({ x: 0, y: 0, width: 50, height: 50 }, PIXELS);
    }, [onCropComplete]);
    return <div data-testid="cropper" />;
  },
}));
vi.mock('./cropImage', () => ({ loadImage: vi.fn(), cropToJpeg: vi.fn() }));
vi.mock('../../api/auth', async (importOriginal) => ({
  ...(await importOriginal<typeof authApi>()),
  uploadAvatar: vi.fn(),
}));

const mockedLoad = vi.mocked(cropImage.loadImage);
const mockedCrop = vi.mocked(cropImage.cropToJpeg);
const mockedUpload = vi.mocked(authApi.uploadAvatar);
const IMAGE = {} as HTMLImageElement;
const BLOB = new Blob(['jpeg'], { type: 'image/jpeg' });

function renderEditor(onClose = vi.fn()) {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
  render(
    <QueryClientProvider client={queryClient}>
      <AvatarEditorModal file={new File(['x'], 'me.jpg', { type: 'image/jpeg' })} onClose={onClose} />
    </QueryClientProvider>,
  );
  return { onClose, invalidate };
}

describe('AvatarEditorModal', () => {
  beforeEach(() => {
    URL.createObjectURL = vi.fn(() => 'blob:photo');
    URL.revokeObjectURL = vi.fn();
    mockedLoad.mockReset().mockResolvedValue(IMAGE);
    mockedCrop.mockReset().mockResolvedValue(BLOB);
    mockedUpload.mockReset().mockResolvedValue(42);
    useToastStore.setState({ toasts: [] });
  });
  afterEach(() => vi.restoreAllMocks());

  it('is an accessible dialog with a zoom control', async () => {
    renderEditor();

    expect(await screen.findByRole('dialog', { name: 'Encuadra tu foto' })).toBeInTheDocument();
    expect(screen.getByLabelText('Zoom')).toHaveValue('1');
    expect(screen.getByTestId('cropper')).toBeInTheDocument();
  });

  it('saves the cropped JPEG and refreshes every view', async () => {
    const user = userEvent.setup();
    const { onClose, invalidate } = renderEditor();

    await user.click(await screen.findByRole('button', { name: 'Guardar' }));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(mockedCrop).toHaveBeenCalledWith(IMAGE, PIXELS);
    expect(mockedUpload).toHaveBeenCalledWith(BLOB);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['me'] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['league-detail'] });
    expect(useToastStore.getState().toasts.at(-1)?.type).toBe('success');
  });

  it('keeps the editor open and shows the error when the upload fails', async () => {
    mockedUpload.mockRejectedValue({ response: { data: { message: 'La imagen debe ser JPEG' } } });
    const user = userEvent.setup();
    const { onClose } = renderEditor();

    await user.click(await screen.findByRole('button', { name: 'Guardar' }));

    await waitFor(() => expect(useToastStore.getState().toasts.at(-1)?.message).toBe('La imagen debe ser JPEG'));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('shows an error when the image cannot be decoded', async () => {
    mockedLoad.mockRejectedValue(new Error('No se puede abrir esta imagen'));
    renderEditor();

    expect(await screen.findByRole('alert')).toHaveTextContent('No se puede abrir esta imagen');
    expect(screen.queryByTestId('cropper')).toBeNull();
    expect(screen.getByRole('button', { name: 'Guardar' })).toBeDisabled();
  });

  it('closes with Escape', async () => {
    const user = userEvent.setup();
    const { onClose } = renderEditor();
    await screen.findByTestId('cropper');

    await user.keyboard('{Escape}');

    expect(onClose).toHaveBeenCalled();
  });

  it('revokes the object URL on unmount', async () => {
    const queryClient = new QueryClient();
    const { unmount } = render(
      <QueryClientProvider client={queryClient}>
        <AvatarEditorModal file={new File(['x'], 'me.jpg', { type: 'image/jpeg' })} onClose={vi.fn()} />
      </QueryClientProvider>,
    );
    await screen.findByTestId('cropper');

    unmount();

    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:photo');
  });
});
```

- [ ] **Step 2: Ejecutar y ver que falla**

Run: `npx vitest run src/components/avatar/AvatarEditorModal.test.tsx`
Expected: FAIL (módulo no existe).

- [ ] **Step 3: Implementar** — `src/components/avatar/AvatarEditorModal.tsx`

```tsx
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import Cropper from 'react-easy-crop';
import type { Area, Point } from 'react-easy-crop';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { uploadAvatar } from '../../api/auth';
import { useToastStore } from '../../store/toastStore';
import { extractErrorMessage } from '../../utils/errorMessage';
import { previewImageStyle } from '../../utils/avatarFile';
import { cropToJpeg, loadImage } from './cropImage';

const MAX_ZOOM = 4;

interface AvatarEditorModalProps {
  file: File;
  onClose: () => void;
}

interface LoadedImage {
  src: string;
  image: HTMLImageElement;
}

interface CropArea {
  /** En % de la imagen (vista previa). */
  percent: Area;
  /** En px de la imagen original (recorte). */
  pixels: Area;
}

/** Encuadre de la foto de perfil: arrastrar para mover, rueda / pinch / slider para el zoom. */
export default function AvatarEditorModal({ file, onClose }: AvatarEditorModalProps) {
  const titleId = useId();
  const zoomId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);
  const [loaded, setLoaded] = useState<LoadedImage | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [area, setArea] = useState<CropArea | null>(null);

  // El object URL se crea y se libera en el mismo efecto (también bajo StrictMode).
  useEffect(() => {
    const src = URL.createObjectURL(file);
    let cancelled = false;
    loadImage(src)
      .then((image) => { if (!cancelled) setLoaded({ src, image }); })
      .catch(() => { if (!cancelled) setLoadFailed(true); });
    return () => {
      cancelled = true;
      URL.revokeObjectURL(src);
    };
  }, [file]);

  useEffect(() => {
    dialogRef.current?.focus();
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const onCropComplete = useCallback((percent: Area, pixels: Area) => setArea({ percent, pixels }), []);

  const save = useMutation({
    mutationFn: async ({ image, pixels }: { image: HTMLImageElement; pixels: Area }) =>
      uploadAvatar(await cropToJpeg(image, pixels)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me'] });
      queryClient.invalidateQueries({ queryKey: ['league-detail'] });
      addToast('success', 'Foto de perfil actualizada');
      onClose();
    },
    onError: (error) => addToast('error', extractErrorMessage(error, 'No se pudo guardar la foto')),
  });

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div
        ref={dialogRef}
        className="modal animate-in-fast avatar-editor"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <h2 id={titleId}>Encuadra tu foto</h2>

        {loadFailed && (
          <p className="error" role="alert">
            No se puede abrir esta imagen. Prueba con una foto en JPG o PNG.
          </p>
        )}
        {!loaded && !loadFailed && <div className="avatar-editor-stage skeleton" aria-hidden="true" />}

        {loaded && (
          <>
            <div className="avatar-editor-stage">
              <Cropper
                image={loaded.src}
                crop={crop}
                zoom={zoom}
                minZoom={1}
                maxZoom={MAX_ZOOM}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            </div>
            <div className="avatar-editor-controls">
              <label htmlFor={zoomId}>Zoom</label>
              <input
                id={zoomId}
                type="range"
                min={1}
                max={MAX_ZOOM}
                step={0.01}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
              />
              {area && (
                <div className="avatar-preview" aria-hidden="true">
                  <img src={loaded.src} alt="" style={previewImageStyle(area.percent)} />
                </div>
              )}
            </div>
          </>
        )}

        <div className="avatar-editor-actions">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button>
          <button
            type="button"
            className="btn-primary"
            disabled={!loaded || !area || save.isPending}
            onClick={() => loaded && area && save.mutate({ image: loaded.image, pixels: area.pixels })}
          >
            {save.isPending ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Estilos** — añadir a `src/index.css` (junto a los de avatar):

```css
.avatar-editor { max-width: 420px; width: 100%; }
.avatar-editor-stage {
  position: relative;
  width: 100%;
  aspect-ratio: 1;
  border-radius: var(--radius);
  overflow: hidden;
  background: var(--surface-2);
}
.avatar-editor-controls { display: flex; align-items: center; gap: 0.75rem; }
.avatar-editor-controls input[type='range'] { flex: 1; accent-color: var(--accent); }
.avatar-preview {
  position: relative;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
  border: 1px solid var(--border);
}
.avatar-preview img { position: absolute; top: 0; left: 0; max-width: none; }
.avatar-editor-actions { display: flex; gap: 0.5rem; justify-content: flex-end; }
```

- [ ] **Step 5: Ejecutar el test**

Run: `npx vitest run src/components/avatar/AvatarEditorModal.test.tsx`
Expected: PASS (6 tests). Si el lint de `react-hooks` marca el `setState` dentro del `.then` del efecto, no es un falso positivo que haya que silenciar: comprobar que el `setState` no es síncrono en el cuerpo del efecto.

- [ ] **Step 6: Lint**

Run: `npm run lint`
Expected: sin errores.

- [ ] **Step 7: Commit**

```powershell
git add src\components\avatar src\index.css
$msg = @'
feat: editor de encuadre de la foto de perfil

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
'@
git commit -m $msg
```

---

### Task 6: Sección "Foto de perfil" en Mi perfil

**Files:**
- Create: `src/components/avatar/ProfilePhotoSection.tsx`
- Test: `src/components/avatar/ProfilePhotoSection.test.tsx`
- Modify: `src/pages/MyProfilePage.tsx`
- Modify: `src/index.css`

**Interfaces:**
- Consumes: `getMe`, `deleteAvatar` (Task 1), `UserAvatar` (Task 2), `avatarFileError` (Task 4), `AvatarEditorModal` (Task 5).
- Produces: `ProfilePhotoSection` (default export) con props `{ username: string }`. Query `['me']` con `staleTime` de 5 min.

- [ ] **Step 1: Test que falla** — `src/components/avatar/ProfilePhotoSection.test.tsx`

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ProfilePhotoSection from './ProfilePhotoSection';
import * as authApi from '../../api/auth';
import { useToastStore } from '../../store/toastStore';

vi.mock('../../api/auth', async (importOriginal) => ({
  ...(await importOriginal<typeof authApi>()),
  getMe: vi.fn(),
  deleteAvatar: vi.fn(),
}));
vi.mock('./AvatarEditorModal', () => ({
  default: ({ file, onClose }: { file: File; onClose: () => void }) => (
    <div role="dialog" aria-label="editor">
      {file.name}
      <button type="button" onClick={onClose}>cerrar editor</button>
    </div>
  ),
}));

const mockedMe = vi.mocked(authApi.getMe);
const mockedDelete = vi.mocked(authApi.deleteAvatar);

function renderSection() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
  const view = render(
    <QueryClientProvider client={queryClient}>
      <ProfilePhotoSection username="ash" />
    </QueryClientProvider>,
  );
  return { ...view, invalidate };
}

describe('ProfilePhotoSection', () => {
  beforeEach(() => {
    mockedMe.mockReset();
    mockedDelete.mockReset().mockResolvedValue(undefined);
    useToastStore.setState({ toasts: [] });
  });

  it('without a photo offers to upload one and shows the initial', async () => {
    mockedMe.mockResolvedValue({ username: 'ash', avatarVersion: null });
    const { container } = renderSection();

    expect(await screen.findByRole('button', { name: 'Subir foto' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Quitar foto' })).toBeNull();
    expect(container.querySelector('img')).toBeNull();
  });

  it('with a photo shows it and offers to change or remove it', async () => {
    mockedMe.mockResolvedValue({ username: 'ash', avatarVersion: 42 });
    const { container } = renderSection();

    expect(await screen.findByRole('button', { name: 'Cambiar foto' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Quitar foto' })).toBeInTheDocument();
    expect(container.querySelector('img')).toHaveAttribute('src', '/api/v1/users/ash/avatar?v=42');
  });

  it('opens the editor with the chosen image and returns focus when it closes', async () => {
    mockedMe.mockResolvedValue({ username: 'ash', avatarVersion: null });
    const user = userEvent.setup();
    renderSection();
    await screen.findByRole('button', { name: 'Subir foto' });

    await user.upload(screen.getByLabelText('Elegir foto de perfil'), new File(['x'], 'me.png', { type: 'image/png' }));

    expect(screen.getByRole('dialog', { name: 'editor' })).toHaveTextContent('me.png');
    await user.click(screen.getByRole('button', { name: 'cerrar editor' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByRole('button', { name: 'Subir foto' })).toHaveFocus();
  });

  it('rejects a non-image file with a toast', async () => {
    mockedMe.mockResolvedValue({ username: 'ash', avatarVersion: null });
    const user = userEvent.setup({ applyAccept: false });
    renderSection();
    await screen.findByRole('button', { name: 'Subir foto' });

    await user.upload(screen.getByLabelText('Elegir foto de perfil'), new File(['x'], 'cv.pdf', { type: 'application/pdf' }));

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(useToastStore.getState().toasts.at(-1)).toMatchObject({ type: 'error' });
  });

  it('removes the photo after confirming', async () => {
    mockedMe.mockResolvedValue({ username: 'ash', avatarVersion: 42 });
    const user = userEvent.setup();
    const { invalidate } = renderSection();

    await user.click(await screen.findByRole('button', { name: 'Quitar foto' }));
    expect(mockedDelete).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Sí, quitar' }));

    await waitFor(() => expect(mockedDelete).toHaveBeenCalled());
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['me'] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['league-detail'] });
  });

  it('can cancel the removal', async () => {
    mockedMe.mockResolvedValue({ username: 'ash', avatarVersion: 42 });
    const user = userEvent.setup();
    renderSection();

    await user.click(await screen.findByRole('button', { name: 'Quitar foto' }));
    await user.click(screen.getByRole('button', { name: 'No' }));

    expect(screen.getByRole('button', { name: 'Quitar foto' })).toBeInTheDocument();
    expect(mockedDelete).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Ejecutar y ver que falla**

Run: `npx vitest run src/components/avatar/ProfilePhotoSection.test.tsx`
Expected: FAIL (módulo no existe).

- [ ] **Step 3: Implementar** — `src/components/avatar/ProfilePhotoSection.tsx`

```tsx
import { useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { deleteAvatar, getMe } from '../../api/auth';
import { useToastStore } from '../../store/toastStore';
import { extractErrorMessage } from '../../utils/errorMessage';
import { avatarFileError } from '../../utils/avatarFile';
import UserAvatar from './UserAvatar';
import AvatarEditorModal from './AvatarEditorModal';

interface ProfilePhotoSectionProps {
  username: string;
}

/** Subir, cambiar o quitar la foto de perfil (Mi perfil). */
export default function ProfilePhotoSection({ username }: ProfilePhotoSectionProps) {
  const queryClient = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);
  const inputRef = useRef<HTMLInputElement>(null);
  const changeButtonRef = useRef<HTMLButtonElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [confirmingRemove, setConfirmingRemove] = useState(false);

  const { data: me } = useQuery({ queryKey: ['me'], queryFn: getMe, staleTime: 5 * 60_000 });
  const hasPhoto = me?.avatarVersion != null;

  const remove = useMutation({
    mutationFn: deleteAvatar,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me'] });
      queryClient.invalidateQueries({ queryKey: ['league-detail'] });
      setConfirmingRemove(false);
      addToast('success', 'Foto de perfil quitada');
    },
    onError: (error) => addToast('error', extractErrorMessage(error, 'No se pudo quitar la foto')),
  });

  function onFileChosen(e: ChangeEvent<HTMLInputElement>) {
    const chosen = e.target.files?.[0];
    e.target.value = ''; // permite volver a elegir el mismo fichero
    if (!chosen) return;
    const error = avatarFileError(chosen);
    if (error) {
      addToast('error', error);
      return;
    }
    setFile(chosen);
  }

  function closeEditor() {
    setFile(null);
    changeButtonRef.current?.focus();
  }

  return (
    <div className="profile-photo">
      <UserAvatar
        username={username}
        size={96}
        avatarVersion={me?.avatarVersion ?? null}
        className="member-avatar-hero"
      />
      <div className="profile-photo-actions">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          hidden
          aria-label="Elegir foto de perfil"
          onChange={onFileChosen}
        />
        <button
          ref={changeButtonRef}
          type="button"
          className="btn-secondary"
          onClick={() => inputRef.current?.click()}
        >
          {hasPhoto ? 'Cambiar foto' : 'Subir foto'}
        </button>
        {hasPhoto && !confirmingRemove && (
          <button type="button" className="btn-ghost" onClick={() => setConfirmingRemove(true)}>
            Quitar foto
          </button>
        )}
        {hasPhoto && confirmingRemove && (
          <span className="profile-photo-confirm" role="group" aria-label="Confirmar quitar foto">
            ¿Quitar la foto?
            <button
              type="button"
              className="btn-danger"
              disabled={remove.isPending}
              onClick={() => remove.mutate()}
            >
              Sí, quitar
            </button>
            <button type="button" className="btn-ghost" onClick={() => setConfirmingRemove(false)}>
              No
            </button>
          </span>
        )}
      </div>
      {file && <AvatarEditorModal file={file} onClose={closeEditor} />}
    </div>
  );
}
```

- [ ] **Step 4: Estilos** — añadir a `src/index.css`:

```css
.profile-photo { display: flex; align-items: center; gap: 1.25rem; flex-wrap: wrap; }
.profile-photo-actions { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
.profile-photo-confirm { display: inline-flex; align-items: center; gap: 0.5rem; font-size: 0.85rem; }
```

- [ ] **Step 5: Ejecutar el test**

Run: `npx vitest run src/components/avatar/ProfilePhotoSection.test.tsx`
Expected: PASS (6 tests). Si `user.upload` no dispara `onChange` por el atributo `hidden` del input, no cambiar el componente: en esos dos tests usar `fireEvent.change(input, { target: { files: [file] } })` (de `@testing-library/react`).

- [ ] **Step 6: Integrar en `MyProfilePage.tsx`**

Imports:

```tsx
import { getMe } from '../api/auth';
import UserAvatar from '../components/avatar/UserAvatar';
import ProfilePhotoSection from '../components/avatar/ProfilePhotoSection';
```

Tras `const addToast = ...`:

```tsx
  const { data: me } = useQuery({ queryKey: ['me'], queryFn: getMe, staleTime: 5 * 60_000 });
```

Hero: sustituir

```tsx
          <div style={{
            width: 64, height: 64, borderRadius: '50%',
            background: 'var(--accent-dim)', border: '2px solid var(--accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.75rem', fontWeight: 800, color: 'var(--accent)', flexShrink: 0,
          }}>
            {username?.[0]?.toUpperCase()}
          </div>
```

por

```tsx
          <UserAvatar
            username={username ?? ''}
            size={64}
            avatarVersion={me?.avatarVersion ?? null}
            className="member-avatar-hero"
          />
```

Y justo antes de `{/* ── Cuenta ── */}`:

```tsx
        {/* ── Foto de perfil ── */}
        <p className="section-label" style={{ margin: '2rem 0 0.75rem' }}>Foto de perfil</p>
        <ProfilePhotoSection username={username ?? ''} />

```

- [ ] **Step 7: Todo el front**

Run: `./node_modules/.bin/tsc --noEmit ; npm run lint ; npm test`
Expected: en verde.

- [ ] **Step 8: Commit**

```powershell
git add src
$msg = @'
feat: subir, cambiar y quitar la foto desde Mi perfil

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
'@
git commit -m $msg
```

---

### Task 7: Verificación en navegador, PR y vault

- [ ] **Step 1: CI local**

Run: `npm run lint ; npm run api:check ; npm test ; npm run build`
Expected: todo en verde.

- [ ] **Step 2: Prueba real contra el backend local** (worktree del backend arrancado con Mongo y Redis, `.env.local` con `VITE_API_URL=http://localhost:8080`, `npm run dev`), en el navegador integrado:
  1. Registrarse, ir a Mi perfil → "Subir foto" con una foto grande vertical (p. ej. 3000x4000): el círculo cubre siempre imagen (no deja huecos al arrastrar ni con zoom 1), la vista previa de 40 px coincide con el encuadre.
  2. Guardar → toast, el hero y la sección muestran la foto; en la pestaña de red, la subida pesa < 60 KB y el `GET` de la foto trae `Cache-Control` con `immutable`.
  3. Cambiar por otra foto (PNG con transparencia) → se ve la nueva (fondo blanco, no negro) sin recargar; entrar en una liga: la foto sale en Miembros, Equipos, Clasificación, Calendario, Actividad, Draft y trades.
  4. Quitar foto → vuelve la inicial en todas partes.
  5. Repetir 1-2 a 375 px (preset móvil) con arrastre y pinch; revisar modo oscuro.
  6. Elegir un PDF (el selector lo filtra; forzarlo desde "Todos los archivos") → toast de error.
  Adjuntar capturas de 2 y 3 al PR.

- [ ] **Step 3: Push y PR contra `main`** con la API de GitHub (`Pokemons-Fantasy/pokefantasy-web`), título `feat: foto de perfil (frontend)`, cuerpo: qué hace, dependencia nueva (`react-easy-crop`, ADR-014), PR del backend del que depende (hay que mergearlo antes: si no, Mi perfil muestra la inicial y la subida da error), capturas, y al final `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.

```powershell
git push -u origin feature/foto-de-perfil
```

- [ ] **Step 4: Vault** (`C:\PokeFantasy\vault`, `git pull` antes, commit directo a `main`):
  - `50 Features/Avatar.md`: `prs_front` con el número del PR; `paginas_front` añade las vistas de liga.
  - `40 Frontend/Estructura frontend.md`: carpeta `components/avatar/` (`UserAvatar`, `AvatarVersionsContext`, `AvatarEditorModal`, `ProfilePhotoSection`) y que `LeagueLayout` provee las versiones de foto.
  - `20 Arquitectura/API REST.md`: columna de páginas que usan los endpoints nuevos.
  - `70 Decisiones/ADR-014 Fotos de perfil en MongoDB.md`: `prs_front`.

```powershell
cd C:\PokeFantasy\vault
git pull
git add -A
$msg = @'
docs: foto de perfil en el frontend

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
'@
git commit -m $msg
git push
```

- [ ] **Step 5: Tras mergear ambos PRs**: `estado: hecho` en `50 Features/Avatar.md` y borrar los worktrees (`git worktree remove ..\pokefantasy-avatar` y `..\pokefantasy-web-avatar`).
