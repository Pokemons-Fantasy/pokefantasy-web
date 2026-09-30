# Notificaciones push en la web: frontend

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** que quien use la web (PC y móvil) pueda activar, con su permiso, los avisos push que ya tiene la app Android (turno del draft, robo, propuesta de intercambio, cierre de ventana) y le lleguen aunque no tenga la página abierta; y que la web se pueda instalar (necesario para los avisos en iPhone).

**Architecture:** el navegador pide su token a Firebase Cloud Messaging con el SDK web (`firebase/messaging`, cargado solo cuando hace falta) y lo registra en `POST /v1/users/push-token`, como la app. Un service worker propio (`public/firebase-messaging-sw.js`, sin SDK) muestra el aviso si la web no está a la vista y abre su enlace al pulsarlo. El estado (no disponible, hay que instalarla, bloqueadas, activadas, sin decidir) sale de una función pura; la orquestación (activar, desactivar, reanudar al entrar, dar de baja al cerrar sesión) vive en `src/push/`. Un aviso propio en el Draft y la home pide el permiso con un clic; un interruptor en Mi perfil y en el panel de la cuenta permite activarlas o desactivarlas.

**Tech Stack:** React 19, Vite, TypeScript, React Query 5, Zustand, Vitest + Testing Library, Firebase JS SDK 12.19.0 (`firebase/app`, `firebase/messaging`), Capacitor (la app nativa no cambia).

**Spec:** diseño aprobado en la conversación del 2026-09-30 (resumen abajo). Plan hermano del backend: `pokefantasy/docs/superpowers/plans/2026-09-30-push-web-backend.md` (debe estar mergeado antes que este PR: añade `DELETE /v1/users/push-token` y los enlaces).

## Diseño aprobado (resumen)
- FCM también en la web; todos los avisos de la app (opción A); web instalable para iPhone (opción A); aviso propio en Draft y home + interruptor en Mi perfil y panel de la cuenta (opción A); desactivar da de baja el token en el back.
- El permiso del navegador solo se pide al pulsar "Activar" (nunca al cargar).
- Al cerrar sesión se da de baja el token de ese navegador; al entrar, si esa persona las tenía activadas, se vuelve a registrar.
- Con la web a la vista no se muestra el aviso del sistema (ya salen los toasts del SSE), como hace el SDK de Firebase.
- La app nativa no cambia.
- Iconos de la web instalable desde el icono de la app (`resources/icon.png`, 1024 px); el favicon (logo de Vite) pasa a ser ese icono.
- Sin caché offline: el service worker solo gestiona avisos.
- Configuración que hace el usuario: app web y certificado Web Push (VAPID) en Firebase; variables `VITE_FIREBASE_*` en Netlify. Sin ellas la web no ofrece los avisos y todo lo demás funciona igual.

## Global Constraints
- Rama `feature/push-web` desde `main`; PR contra `main`. Commits con `git commit -F <fichero>` (UTF-8 sin BOM) y `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Comprobaciones: `rtk proxy npx vitest run` (sin `rtk proxy`, `rtk` oculta la salida), `npx tsc -p tsconfig.app.json --noEmit` (el `tsc --noEmit` a secas no comprueba la app), `npm run lint`, `npm run build`, `npm run api:check` (en local falla solo por CRLF; la CI en Linux pasa).
- Llamadas HTTP solo en `src/api/*.ts`. Lógica pura en `src/utils/*.ts` con test. Integración con Firebase en `src/push/` (carpeta nueva; se documenta en el ADR y en el CLAUDE.md del repo).
- `firebase` se importa **solo con `import()` dinámico**, nunca en el nivel superior de un módulo que cargue la app al arrancar.
- `Notification.requestPermission()` debe ser lo primero que se ejecuta al pulsar "Activar" (antes de cualquier `await`): Safari solo concede el permiso dentro del gesto.
- `localStorage` siempre dentro de `try/catch`. Claves por usuario: `pf:web-push:<usuario>` (guarda el token = activadas) y `pf:web-push-dismissed:<usuario>` (`'1'` = "Ahora no").
- Variables de entorno (Vite): `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`, `VITE_FIREBASE_VAPID_KEY`. Si falta alguna, los avisos web no se ofrecen.
- Textos en español de España, sin la palabra "click" (glosario: `src/glossary.test.ts`). Accesibilidad: el aviso con `role="status"`, el interruptor con `role="switch"` y `aria-checked`.

## Review Focus
1. **Pulsar "Activar" en Safari/iPhone instalada:** si `requestPermission` no es lo primero del clic, Safari lo rechaza sin preguntar. Test en Task 4: `enableWebPush` llama a `Notification.requestPermission` antes de importar Firebase.
2. **Otra cuenta en el mismo navegador:** `ash` activa y cierra sesión; entra `brock` y no activa nada. `brock` no debe recibir los avisos de `ash` ni verse "activadas": logout da de baja el token (test en Task 4) y el estado es por usuario (test en Task 3).
3. **El usuario cierra el diálogo del navegador sin elegir** (`permission` queda en `default`): no se registra nada, el estado vuelve a "sin decidir" y el aviso propio sigue ofreciendo "Activar" (test en Task 4 y Task 5).
4. **Bloqueadas en el navegador:** el interruptor explica cómo desbloquearlas en vez de ofrecer un botón que no hace nada (test en Task 5).
5. **Firebase sin configurar (faltan las `VITE_FIREBASE_*`):** ni aviso ni interruptor, y el resto de la web igual (tests en Task 3 y Task 5).

---

## File Structure
- Create `scripts/generate-pwa-icons.ps1`: genera `public/icons/*.png` desde `resources/icon.png`.
- Create `public/icons/{icon-192,icon-512,icon-maskable-512,apple-touch-icon,favicon-48}.png`, `public/manifest.webmanifest`, `public/_headers`; Modify `index.html`; Delete `public/favicon.svg`.
- Create `src/pwa.test.ts`: el manifest y el `index.html` están bien enlazados.
- Create `src/api/push.ts` (+ test): `registerPushToken`, `unregisterPushToken`. Modify `src/main.tsx` para usarla.
- Modify `openapi.json`, `src/api/schema.d.ts`: regenerados con el back nuevo.
- Create `src/utils/webPush.ts` (+ test): estado y claves.
- Create `src/push/config.ts`, `src/push/env.ts`, `src/push/webPush.ts` (+ test); Modify `src/vite-env.d.ts`.
- Create `public/firebase-messaging-sw.js`.
- Modify `src/store/authStore.ts` (+ test): dar de baja al cerrar sesión.
- Modify `src/App.tsx`: `WebPushResume` en `RootLayout`.
- Create `src/hooks/useWebPush.ts`, `src/components/push/PushPrompt.tsx`, `src/components/push/PushToggle.tsx` (+ tests).
- Modify `src/pages/HomePage.tsx`, `src/pages/DraftPage.tsx`, `src/pages/MyProfilePage.tsx`, `src/components/UserDrawer.tsx`, `src/index.css`.
- Modify `CLAUDE.md` (dónde va el código de `src/push/`), `package.json`/`package-lock.json` (`firebase`).

---

### Task 1: web instalable (manifest, iconos, metadatos)

**Files:**
- Create: `scripts/generate-pwa-icons.ps1`, `public/manifest.webmanifest`, `public/_headers`, `public/icons/*.png`, `src/pwa.test.ts`
- Modify: `index.html`
- Delete: `public/favicon.svg`

**Interfaces:**
- Produces: `/icons/icon-192.png` (lo usa el back como icono de los avisos y el service worker), `/manifest.webmanifest`.

- [ ] **Step 1: Test (falla)**

`src/pwa.test.ts`:

```ts
import { describe, it, expect } from 'vitest';

// Ficheros de la raíz leídos en crudo (como glossary.test.ts): el manifest, el HTML y los iconos
const raw = import.meta.glob(['/public/manifest.webmanifest', '/index.html'], {
  query: '?raw', import: 'default', eager: true,
}) as Record<string, string>;
const icons = Object.keys(import.meta.glob('/public/icons/*.png', { query: '?url', eager: true }));

describe('web instalable', () => {
  it('el manifest describe la app y sus iconos existen', () => {
    const manifest = JSON.parse(raw['/public/manifest.webmanifest']);
    expect(manifest).toMatchObject({ name: 'PokeFantasy', short_name: 'PokeFantasy', start_url: '/', display: 'standalone', lang: 'es' });
    const sources = manifest.icons.map((i: { src: string }) => `/public${i.src}`);
    expect(sources).toEqual(expect.arrayContaining(['/public/icons/icon-192.png', '/public/icons/icon-512.png', '/public/icons/icon-maskable-512.png']));
    sources.forEach((src: string) => expect(icons).toContain(src));
    expect(manifest.icons.some((i: { purpose?: string }) => i.purpose === 'maskable')).toBe(true);
  });

  it('index.html enlaza el manifest, el icono de Apple y el favicon nuevo', () => {
    const html = raw['/index.html'];
    expect(html).toContain('<link rel="manifest" href="/manifest.webmanifest"');
    expect(html).toContain('<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png"');
    expect(html).toContain('<meta name="apple-mobile-web-app-capable" content="yes"');
    expect(html).not.toContain('favicon.svg');
    expect(icons).toContain('/public/icons/apple-touch-icon.png');
    expect(icons).toContain('/public/icons/favicon-48.png');
  });
});
```

- [ ] **Step 2: Ejecutar y ver que falla**

Run: `rtk proxy npx vitest run src/pwa.test.ts`
Expected: FAIL (no existe el manifest).

- [ ] **Step 3: Script de iconos y generación**

`scripts/generate-pwa-icons.ps1`:

```powershell
# Iconos de la web instalable desde el icono de la app Android (resources/icon.png, 1024x1024).
# Uso (desde la raíz del repo): powershell -ExecutionPolicy Bypass -File scripts/generate-pwa-icons.ps1
Add-Type -AssemblyName System.Drawing
$source = [System.Drawing.Image]::FromFile((Resolve-Path 'resources/icon.png'))
$out = 'public/icons'
New-Item -ItemType Directory -Force $out | Out-Null

function Save-Icon([int]$size, [string]$name, [double]$scale = 1.0, [string]$background = '') {
    $bitmap = New-Object System.Drawing.Bitmap $size, $size
    $g = [System.Drawing.Graphics]::FromImage($bitmap)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    if ($background) { $g.Clear([System.Drawing.ColorTranslator]::FromHtml($background)) }
    $inner = [int]($size * $scale)
    $offset = [int](($size - $inner) / 2)
    $g.DrawImage($source, $offset, $offset, $inner, $inner)
    $bitmap.Save((Join-Path (Resolve-Path $out) $name), [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose(); $bitmap.Dispose()
}

Save-Icon 192 'icon-192.png'
Save-Icon 512 'icon-512.png'
# Maskable: el sistema recorta en círculo o squircle; el dibujo va al 80 % sobre el fondo de la app
Save-Icon 512 'icon-maskable-512.png' 0.8 '#0a0a0f'
# iOS no admite transparencia en el icono de la pantalla de inicio
Save-Icon 180 'apple-touch-icon.png' 1.0 '#0a0a0f'
Save-Icon 48 'favicon-48.png'
$source.Dispose()
```

Run: `powershell -ExecutionPolicy Bypass -File scripts/generate-pwa-icons.ps1`
Después, abrir `public/icons/icon-maskable-512.png` y `public/icons/apple-touch-icon.png` con la herramienta de leer imágenes y comprobar que el icono se ve entero y centrado. Si `resources/icon.png` ya trae fondo propio hasta el borde, dejar el maskable así; si el dibujo se corta, bajar la escala a 0.7 y regenerar.

- [ ] **Step 4: Manifest, cabeceras y `index.html`**

`public/manifest.webmanifest`:

```json
{
  "name": "PokeFantasy",
  "short_name": "PokeFantasy",
  "description": "Ligas fantasy de Pokémon con tus amigos",
  "lang": "es",
  "start_url": "/",
  "scope": "/",
  "display": "standalone",
  "background_color": "#0a0a0f",
  "theme_color": "#0a0a0f",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/icons/icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

`public/_headers` (Netlify):

```
/firebase-messaging-sw.js
  Cache-Control: no-cache
/manifest.webmanifest
  Content-Type: application/manifest+json
```

`index.html`: sustituir `<link rel="icon" type="image/svg+xml" href="/favicon.svg" />` por:

```html
    <link rel="icon" type="image/png" sizes="48x48" href="/icons/favicon-48.png" />
    <link rel="manifest" href="/manifest.webmanifest" />
    <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
    <meta name="theme-color" content="#0a0a0f" />
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-title" content="PokeFantasy" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
```

Borrar `public/favicon.svg` (`git rm public/favicon.svg`; antes comprobar con `git grep -n "favicon.svg"` que nada más lo usa).

- [ ] **Step 5: Ejecutar**

Run: `rtk proxy npx vitest run src/pwa.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 6: Commit**

```
feat(pwa): la web se puede instalar (manifest, iconos y metadatos de Apple)

Necesario para los avisos push en iPhone, que solo funcionan con la web en la
pantalla de inicio. Iconos generados desde el de la app
(scripts/generate-pwa-icons.ps1); el favicon deja de ser el logo de Vite.
```

---

### Task 2: API de tokens y contrato

**Files:**
- Create: `src/api/push.ts`, `src/api/push.test.ts`
- Modify: `src/main.tsx`, `openapi.json`, `src/api/schema.d.ts`

**Interfaces:**
- Produces: `registerPushToken(token: string): Promise<void>` (POST), `unregisterPushToken(token: string): Promise<void>` (DELETE con cuerpo `{token}`).
- Consumes: back con `DELETE /v1/users/push-token` (plan del backend, Task 3).

- [ ] **Step 1: Test (falla)**

`src/api/push.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiClient } from './client';
import { registerPushToken, unregisterPushToken } from './push';

describe('api/push', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('registra el token del dispositivo', async () => {
    const post = vi.spyOn(apiClient, 'post').mockResolvedValue({ data: undefined });
    await registerPushToken('tok-1');
    expect(post).toHaveBeenCalledWith('/v1/users/push-token', { token: 'tok-1' });
  });

  it('da de baja el token con DELETE y el token en el cuerpo', async () => {
    const del = vi.spyOn(apiClient, 'delete').mockResolvedValue({ data: undefined });
    await unregisterPushToken('tok-1');
    expect(del).toHaveBeenCalledWith('/v1/users/push-token', { data: { token: 'tok-1' } });
  });
});
```

- [ ] **Step 2: Ejecutar y ver que falla**

Run: `rtk proxy npx vitest run src/api/push.test.ts` → FAIL (no existe `./push`).

- [ ] **Step 3: Implementar y usarla en `main.tsx`**

`src/api/push.ts`:

```ts
import { apiClient } from './client';

/** Registra el token FCM de este dispositivo (app o navegador) para el usuario en sesión. */
export const registerPushToken = async (token: string): Promise<void> => {
  await apiClient.post('/v1/users/push-token', { token });
};

/** Da de baja este dispositivo: deja de recibir avisos (solo se quita al usuario en sesión). */
export const unregisterPushToken = async (token: string): Promise<void> => {
  await apiClient.delete('/v1/users/push-token', { data: { token } });
};
```

En `src/main.tsx`: sustituir `await apiClient.post('/v1/users/push-token', { token: fcmToken })` por `await registerPushToken(fcmToken)`, importar `registerPushToken` de `./api/push` y quitar `apiClient` del import si ya no se usa (sigue usándose `onSessionExpired`).

- [ ] **Step 4: Regenerar el contrato con el back nuevo**

Con la rama `feature/push-web` del back compilada (`.\mvnw.cmd -B -ntp -f src/pom.xml -q -DskipTests package` en su worktree), arrancar el jar en segundo plano: `SPRING_MAIN_LAZY_INITIALIZATION=true`, `SERVER_PORT=8089` (el 8080 está ocupado en este equipo), `JWT_SECRET` aleatorio en Base64, `java -jar src/boot/target/boot-1.1.0.jar`. Después, en el front:

```
npm run api:spec -- http://localhost:8089/v3/api-docs
```
Cambiar en `openapi.json` el `servers[0].url` de vuelta a `http://localhost:8080`, `npm run api:types`, y parar el proceso java por su línea de comandos. `git diff --stat openapi.json src/api/schema.d.ts` debe mostrar solo el `delete` de `/v1/users/push-token`.

- [ ] **Step 5: Ejecutar y commit**

Run: `rtk proxy npx vitest run src/api/push.test.ts` → PASS; `npx tsc -p tsconfig.app.json --noEmit` → sin errores.

```
feat(push): api de tokens de avisos (registrar y dar de baja)

src/api/push.ts con POST y DELETE /v1/users/push-token; main.tsx la usa para
la app nativa. Contrato regenerado con el back nuevo.
```

---

### Task 3: estado de los avisos web (lógica pura y entorno)

**Files:**
- Create: `src/utils/webPush.ts`, `src/utils/webPush.test.ts`, `src/push/config.ts`, `src/push/env.ts`
- Modify: `src/vite-env.d.ts`

**Interfaces:**
- Produces:
  - `type WebPushStatus = 'hidden' | 'unsupported' | 'needs-install' | 'blocked' | 'enabled' | 'off'`
  - `interface WebPushEnv { native: boolean; configured: boolean; supported: boolean; ios: boolean; standalone: boolean; permission: NotificationPermission | 'unsupported'; enabled: boolean }`
  - `webPushStatus(env: WebPushEnv): WebPushStatus`
  - `shouldPrompt(status: WebPushStatus, dismissed: boolean): boolean`
  - `pushTokenKey(username: string): string` → `pf:web-push:<usuario>`; `pushDismissedKey(username: string): string` → `pf:web-push-dismissed:<usuario>`
  - `firebaseWebConfig(): { config: { apiKey: string; projectId: string; messagingSenderId: string; appId: string }; vapidKey: string } | null` y `webPushConfigured(): boolean` (en `src/push/config.ts`)
  - `readWebPushEnv(username: string | null): WebPushEnv` y `storage.get/set/remove(key)` seguros (en `src/push/env.ts`)

- [ ] **Step 1: Test (falla)**

`src/utils/webPush.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { pushDismissedKey, pushTokenKey, shouldPrompt, webPushStatus, type WebPushEnv } from './webPush';

const env = (patch: Partial<WebPushEnv> = {}): WebPushEnv => ({
  native: false, configured: true, supported: true, ios: false, standalone: false,
  permission: 'default', enabled: false, ...patch,
});

describe('webPushStatus', () => {
  it('en la app nativa o sin Firebase configurado no se ofrece nada', () => {
    expect(webPushStatus(env({ native: true }))).toBe('hidden');
    expect(webPushStatus(env({ configured: false }))).toBe('hidden');
  });

  it('iPhone en Safari sin instalar: hay que añadirla a la pantalla de inicio', () => {
    expect(webPushStatus(env({ ios: true, standalone: false, supported: false }))).toBe('needs-install');
    expect(webPushStatus(env({ ios: true, standalone: true }))).toBe('off');
  });

  it('navegador sin push, bloqueadas, activadas y sin decidir', () => {
    expect(webPushStatus(env({ supported: false }))).toBe('unsupported');
    expect(webPushStatus(env({ permission: 'denied' }))).toBe('blocked');
    expect(webPushStatus(env({ permission: 'granted', enabled: true }))).toBe('enabled');
    expect(webPushStatus(env({ permission: 'granted', enabled: false }))).toBe('off');
    expect(webPushStatus(env({ permission: 'default', enabled: true }))).toBe('off');
  });
});

describe('shouldPrompt', () => {
  it('solo sin decidir o por instalar, y si no se ha dicho "Ahora no"', () => {
    expect(shouldPrompt('off', false)).toBe(true);
    expect(shouldPrompt('needs-install', false)).toBe(true);
    expect(shouldPrompt('off', true)).toBe(false);
    for (const status of ['hidden', 'unsupported', 'blocked', 'enabled'] as const) {
      expect(shouldPrompt(status, false)).toBe(false);
    }
  });
});

describe('claves por usuario', () => {
  it('cada cuenta tiene las suyas en el mismo navegador', () => {
    expect(pushTokenKey('ash')).toBe('pf:web-push:ash');
    expect(pushDismissedKey('ash')).toBe('pf:web-push-dismissed:ash');
    expect(pushTokenKey('ash')).not.toBe(pushTokenKey('brock'));
  });
});
```

- [ ] **Step 2: Ejecutar y ver que falla**

Run: `rtk proxy npx vitest run src/utils/webPush.test.ts` → FAIL.

- [ ] **Step 3: Implementar**

`src/utils/webPush.ts`:

```ts
/** Estado de los avisos push en este navegador para el usuario en sesión. */
export type WebPushStatus =
  | 'hidden'        // app nativa (tiene los suyos) o Firebase sin configurar: no se ofrece nada
  | 'unsupported'   // el navegador no admite push
  | 'needs-install' // iPhone/iPad en Safari: solo con la web en la pantalla de inicio
  | 'blocked'       // permiso denegado: solo se desbloquea en los ajustes del navegador
  | 'enabled'
  | 'off';          // se puede activar

export interface WebPushEnv {
  native: boolean;
  configured: boolean;
  supported: boolean;
  ios: boolean;
  standalone: boolean;
  permission: NotificationPermission | 'unsupported';
  /** Este usuario las activó en este navegador (hay token guardado). */
  enabled: boolean;
}

export function webPushStatus(env: WebPushEnv): WebPushStatus {
  if (env.native || !env.configured) return 'hidden';
  if (env.ios && !env.standalone) return 'needs-install';
  if (!env.supported) return 'unsupported';
  if (env.permission === 'denied') return 'blocked';
  if (env.enabled && env.permission === 'granted') return 'enabled';
  return 'off';
}

/** El aviso propio sale mientras se puede activar (o instalar) y no se ha dicho "Ahora no". */
export function shouldPrompt(status: WebPushStatus, dismissed: boolean): boolean {
  return (status === 'off' || status === 'needs-install') && !dismissed;
}

/** Token registrado por este usuario en este navegador (su presencia = activadas). */
export const pushTokenKey = (username: string) => `pf:web-push:${username}`;
/** "Ahora no" de este usuario en este navegador. */
export const pushDismissedKey = (username: string) => `pf:web-push-dismissed:${username}`;
```

`src/vite-env.d.ts`, añadir:

```ts
interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_FIREBASE_API_KEY?: string;
  readonly VITE_FIREBASE_PROJECT_ID?: string;
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID?: string;
  readonly VITE_FIREBASE_APP_ID?: string;
  readonly VITE_FIREBASE_VAPID_KEY?: string;
}
```

`src/push/config.ts`:

```ts
/** Configuración web de Firebase (valores públicos, en variables de Netlify). Sin alguna, no hay avisos web. */
export function firebaseWebConfig() {
  const env = import.meta.env;
  const apiKey = env.VITE_FIREBASE_API_KEY;
  const projectId = env.VITE_FIREBASE_PROJECT_ID;
  const messagingSenderId = env.VITE_FIREBASE_MESSAGING_SENDER_ID;
  const appId = env.VITE_FIREBASE_APP_ID;
  const vapidKey = env.VITE_FIREBASE_VAPID_KEY;
  if (!apiKey || !projectId || !messagingSenderId || !appId || !vapidKey) return null;
  return { config: { apiKey, projectId, messagingSenderId, appId }, vapidKey };
}

export const webPushConfigured = () => firebaseWebConfig() !== null;
```

`src/push/env.ts`:

```ts
import { Capacitor } from '@capacitor/core';
import { pushTokenKey, type WebPushEnv } from '../utils/webPush';
import { webPushConfigured } from './config';

/** localStorage que nunca lanza (modo privado, almacenamiento bloqueado). */
export const storage = {
  get(key: string): string | null {
    try { return localStorage.getItem(key); } catch { return null; }
  },
  set(key: string, value: string) {
    try { localStorage.setItem(key, value); } catch { /* sin almacenamiento: no se recuerda */ }
  },
  remove(key: string) {
    try { localStorage.removeItem(key); } catch { /* idem */ }
  },
};

/** Lo que el navegador permite ahora mismo, para `webPushStatus`. */
export function readWebPushEnv(username: string | null): WebPushEnv {
  const ua = navigator.userAgent;
  // iPadOS se presenta como Mac: se distingue por la pantalla táctil
  const ios = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const standalone = window.matchMedia?.('(display-mode: standalone)').matches
    || (navigator as Navigator & { standalone?: boolean }).standalone === true;
  const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  return {
    native: Capacitor.isNativePlatform(),
    configured: webPushConfigured(),
    supported,
    ios,
    standalone: !!standalone,
    permission: supported ? Notification.permission : 'unsupported',
    enabled: !!username && !!storage.get(pushTokenKey(username)),
  };
}
```

- [ ] **Step 4: Ejecutar y commit**

Run: `rtk proxy npx vitest run src/utils/webPush.test.ts` → PASS; `npx tsc -p tsconfig.app.json --noEmit` → sin errores.

```
feat(push): estado de los avisos web por usuario y navegador

utils/webPush (puro): oculto, no compatible, por instalar (iPhone), bloqueadas,
activadas o sin decidir, y cuándo ofrecer el aviso. push/config lee las
VITE_FIREBASE_*; push/env lee lo que permite el navegador.
```

---

### Task 4: activar, desactivar, reanudar y dar de baja (Firebase + service worker)

**Files:**
- Create: `src/push/webPush.ts`, `src/push/webPush.test.ts`, `public/firebase-messaging-sw.js`
- Modify: `src/store/authStore.ts`, `src/store/authStore.test.ts`, `src/App.tsx`, `package.json`, `package-lock.json`, `CLAUDE.md`

**Interfaces:**
- Consumes: `registerPushToken`, `unregisterPushToken` (Task 2); `firebaseWebConfig` (Task 3); `storage`, `pushTokenKey` (Task 3).
- Produces (en `src/push/webPush.ts`):
  - `enableWebPush(username: string): Promise<'enabled' | 'blocked' | 'off'>`: primero `Notification.requestPermission()`; si `granted`, registra el service worker, pide el token, lo registra en el back y lo guarda.
  - `disableWebPush(username: string): Promise<void>`
  - `resumeWebPush(username: string): Promise<void>`: si este usuario las tenía activadas y el permiso sigue concedido, vuelve a registrar el token (puede haber cambiado).
  - `forgetWebPushOnLogout(username: string): Promise<void>`: da de baja el token en el back; no toca la preferencia.
  - `dismissWebPushPrompt(username: string): void` y `isWebPushPromptDismissed(username: string): boolean`.
  - `SW_URL = '/firebase-messaging-sw.js'`.

- [ ] **Step 1: Instalar Firebase**

Run: `npm install firebase@12.19.0`
Expected: `package.json` con `"firebase": "^12.19.0"` en `dependencies`.

- [ ] **Step 2: Test (falla)**

`src/push/webPush.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const order: string[] = [];
vi.mock('firebase/app', () => ({
  getApps: vi.fn(() => []),
  initializeApp: vi.fn(() => { order.push('firebase'); return {}; }),
}));
vi.mock('firebase/messaging', () => ({
  getMessaging: vi.fn(() => ({})),
  getToken: vi.fn(async () => 'browser-token'),
  deleteToken: vi.fn(async () => true),
}));
vi.mock('../api/push', () => ({
  registerPushToken: vi.fn(async () => {}),
  unregisterPushToken: vi.fn(async () => {}),
}));

import * as messaging from 'firebase/messaging';
import * as api from '../api/push';
import { disableWebPush, enableWebPush, forgetWebPushOnLogout, resumeWebPush } from './webPush';

const registration = { scope: '/' } as ServiceWorkerRegistration;

function stubBrowser(permission: NotificationPermission, answer: NotificationPermission = permission) {
  vi.stubGlobal('Notification', {
    permission,
    requestPermission: vi.fn(async () => { order.push('permission'); return answer; }),
  });
  Object.defineProperty(navigator, 'serviceWorker', {
    configurable: true,
    value: { register: vi.fn(async () => registration) },
  });
}

describe('push/webPush', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    order.length = 0;
    localStorage.clear();
    vi.stubEnv('VITE_FIREBASE_API_KEY', 'k');
    vi.stubEnv('VITE_FIREBASE_PROJECT_ID', 'p');
    vi.stubEnv('VITE_FIREBASE_MESSAGING_SENDER_ID', 's');
    vi.stubEnv('VITE_FIREBASE_APP_ID', 'a');
    vi.stubEnv('VITE_FIREBASE_VAPID_KEY', 'vapid');
  });

  it('activar pide el permiso antes que nada, registra el token y lo guarda para ese usuario', async () => {
    stubBrowser('default', 'granted');

    await expect(enableWebPush('ash')).resolves.toBe('enabled');

    expect(order[0]).toBe('permission');
    expect(navigator.serviceWorker.register).toHaveBeenCalledWith('/firebase-messaging-sw.js');
    expect(messaging.getToken).toHaveBeenCalledWith(expect.anything(), { vapidKey: 'vapid', serviceWorkerRegistration: registration });
    expect(api.registerPushToken).toHaveBeenCalledWith('browser-token');
    expect(localStorage.getItem('pf:web-push:ash')).toBe('browser-token');
    expect(localStorage.getItem('pf:web-push:brock')).toBeNull();
  });

  it('si deniega o cierra el diálogo no se registra nada', async () => {
    stubBrowser('default', 'denied');
    await expect(enableWebPush('ash')).resolves.toBe('blocked');
    stubBrowser('default', 'default');
    await expect(enableWebPush('ash')).resolves.toBe('off');
    expect(api.registerPushToken).not.toHaveBeenCalled();
    expect(localStorage.getItem('pf:web-push:ash')).toBeNull();
  });

  it('desactivar da de baja el token en el back y en Firebase y olvida la preferencia', async () => {
    stubBrowser('granted');
    localStorage.setItem('pf:web-push:ash', 'browser-token');

    await disableWebPush('ash');

    expect(api.unregisterPushToken).toHaveBeenCalledWith('browser-token');
    expect(messaging.deleteToken).toHaveBeenCalled();
    expect(localStorage.getItem('pf:web-push:ash')).toBeNull();
  });

  it('al cerrar sesión da de baja el token pero recuerda que las quería', async () => {
    localStorage.setItem('pf:web-push:ash', 'browser-token');

    await forgetWebPushOnLogout('ash');

    expect(api.unregisterPushToken).toHaveBeenCalledWith('browser-token');
    expect(localStorage.getItem('pf:web-push:ash')).toBe('browser-token');
  });

  it('al entrar las reanuda solo si ese usuario las tenía y el permiso sigue concedido', async () => {
    stubBrowser('granted');
    await resumeWebPush('brock');
    expect(api.registerPushToken).not.toHaveBeenCalled();

    localStorage.setItem('pf:web-push:ash', 'old-token');
    await resumeWebPush('ash');
    expect(api.registerPushToken).toHaveBeenCalledWith('browser-token');
    expect(localStorage.getItem('pf:web-push:ash')).toBe('browser-token');

    vi.clearAllMocks();
    stubBrowser('denied');
    await resumeWebPush('ash');
    expect(api.registerPushToken).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 3: Ejecutar y ver que falla**

Run: `rtk proxy npx vitest run src/push/webPush.test.ts` → FAIL (no existe `./webPush`).

- [ ] **Step 4: Implementar `src/push/webPush.ts`**

```ts
import { registerPushToken, unregisterPushToken } from '../api/push';
import { pushDismissedKey, pushTokenKey } from '../utils/webPush';
import { firebaseWebConfig } from './config';
import { storage } from './env';

export const SW_URL = '/firebase-messaging-sw.js';

/** Firebase se carga solo aquí y bajo demanda: la web no lo descarga si nadie activa los avisos. */
async function messagingInstance() {
  const settings = firebaseWebConfig();
  if (!settings) throw new Error('Firebase sin configurar');
  const [{ getApps, initializeApp }, { getMessaging }] = await Promise.all([
    import('firebase/app'),
    import('firebase/messaging'),
  ]);
  const app = getApps()[0] ?? initializeApp(settings.config);
  return { messaging: getMessaging(app), vapidKey: settings.vapidKey };
}

async function browserToken(): Promise<string> {
  const registration = await navigator.serviceWorker.register(SW_URL);
  const { messaging, vapidKey } = await messagingInstance();
  const { getToken } = await import('firebase/messaging');
  return getToken(messaging, { vapidKey, serviceWorkerRegistration: registration });
}

/**
 * Activa los avisos en este navegador. Llamarla directamente desde el clic: pedir el permiso es lo primero
 * (Safari solo lo concede dentro del gesto del usuario, antes de cualquier espera).
 */
export async function enableWebPush(username: string): Promise<'enabled' | 'blocked' | 'off'> {
  const permission = await Notification.requestPermission();
  if (permission === 'denied') return 'blocked';
  if (permission !== 'granted') return 'off';
  const token = await browserToken();
  await registerPushToken(token);
  storage.set(pushTokenKey(username), token);
  return 'enabled';
}

/** Desactiva los avisos de este usuario en este navegador. */
export async function disableWebPush(username: string): Promise<void> {
  const token = storage.get(pushTokenKey(username));
  storage.remove(pushTokenKey(username));
  if (token) await unregisterPushToken(token).catch(() => {});
  try {
    const { messaging } = await messagingInstance();
    const { deleteToken } = await import('firebase/messaging');
    await deleteToken(messaging);
  } catch {
    // Sin Firebase o sin red: el back ya no lo tiene, que es lo que importa
  }
}

/** Al entrar o al abrir la web: si este usuario las tenía activadas, vuelve a registrar el token (puede rotar). */
export async function resumeWebPush(username: string): Promise<void> {
  if (!storage.get(pushTokenKey(username))) return;
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
  if (!firebaseWebConfig()) return;
  const token = await browserToken();
  await registerPushToken(token);
  storage.set(pushTokenKey(username), token);
}

/**
 * Al cerrar sesión (antes de cerrarla en el back, que necesita la cookie): este navegador deja de recibir
 * los avisos de esta cuenta. La preferencia se queda para reanudarlos si vuelve a entrar.
 */
export async function forgetWebPushOnLogout(username: string): Promise<void> {
  const token = storage.get(pushTokenKey(username));
  if (token) await unregisterPushToken(token).catch(() => {});
}

export const dismissWebPushPrompt = (username: string) => storage.set(pushDismissedKey(username), '1');
export const isWebPushPromptDismissed = (username: string) => storage.get(pushDismissedKey(username)) === '1';
```

- [ ] **Step 5: Ejecutar**

Run: `rtk proxy npx vitest run src/push/webPush.test.ts` → PASS (5 tests).

- [ ] **Step 6: Service worker**

`public/firebase-messaging-sw.js` (JavaScript plano, no pasa por Vite ni por ESLint):

```js
/*
 * Service worker de los avisos push de la web (FCM). Sin el SDK de Firebase: FCM entrega cada aviso como un
 * push estándar con { notification: { title, body, icon }, data: { link, tag } }. El back pone el enlace y la
 * etiqueta en data para no depender de cómo nombra FCM sus campos (fcmOptions).
 */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    return;
  }
  const notification = payload.notification || {};
  const data = payload.data || {};
  const link = data.link || (payload.fcmOptions && payload.fcmOptions.link) || '/';
  const tag = data.tag || notification.tag;

  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    // Con la web a la vista ya salen los avisos en pantalla (SSE): igual que hace el SDK de Firebase
    if (windows.some((client) => client.visibilityState === 'visible')) return;
    await self.registration.showNotification(notification.title || 'PokeFantasy', {
      body: notification.body || '',
      icon: notification.icon || '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: tag || undefined,
      renotify: !!tag,
      data: { link },
    });
  })());
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = new URL((event.notification.data && event.notification.data.link) || '/', self.location.origin);
  if (target.origin !== self.location.origin) return;

  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const open = windows.find((client) => new URL(client.url).origin === target.origin);
    if (open) {
      await open.focus();
      try {
        await open.navigate(target.href);
        return;
      } catch {
        // Pestaña no controlada por este service worker: se abre una nueva
      }
    }
    await self.clients.openWindow(target.href);
  })());
});
```

- [ ] **Step 7: Dar de baja al cerrar sesión y reanudar al entrar**

`src/store/authStore.test.ts`: añadir al principio `vi.mock('../push/webPush', () => ({ forgetWebPushOnLogout: vi.fn().mockResolvedValue(undefined) }));` y el test:

```ts
import * as webPush from '../push/webPush';
import * as auth from '../api/auth';

describe('authStore: avisos web al cerrar sesión', () => {
  it('da de baja el token de este navegador antes de cerrar la sesión en el back', async () => {
    const calls: string[] = [];
    vi.mocked(webPush.forgetWebPushOnLogout).mockImplementation(async () => { calls.push('forget'); });
    vi.mocked(auth.logout).mockImplementation(async () => { calls.push('logout'); });
    useAuthStore.setState({ username: 'ash' });

    useAuthStore.getState().logout();
    await vi.waitFor(() => expect(calls).toEqual(['forget', 'logout']));
    expect(webPush.forgetWebPushOnLogout).toHaveBeenCalledWith('ash');
  });
});
```

`src/store/authStore.ts`: `import { forgetWebPushOnLogout } from '../push/webPush';` y `logout` pasa a:

```ts
      logout: () => {
        const user = get().username;
        set({ username: null, lastSession: user ? { user, path: currentPath() } : null });
        // Antes de cerrar la sesión en el back (necesita la cookie): este navegador deja de recibir sus avisos
        const forget = user ? forgetWebPushOnLogout(user) : Promise.resolve();
        forget.catch(() => {}).finally(() => { apiLogout().catch(() => {}); });
      },
```

(`src/push/webPush.ts` no importa Firebase en el nivel superior, así que el store no lo arrastra al arranque.)

`src/App.tsx`: junto a `GlobalNotifications`,

```tsx
/** Al abrir la web o entrar: si este usuario tenía los avisos web activados, se vuelve a registrar el token. */
function WebPushResume() {
  const username = useAuthStore((s) => s.username);
  useEffect(() => {
    if (!username || Capacitor.isNativePlatform()) return;
    resumeWebPush(username).catch(() => {});
  }, [username]);
  return null;
}
```
y `<WebPushResume />` dentro de `RootLayout` tras `<GlobalNotifications />` (imports: `useAuthStore`, `resumeWebPush` de `./push/webPush`).

`CLAUDE.md` del repo, tabla "Dónde va el código nuevo": añadir la fila `| Integración con Firebase en la web (avisos push) | src/push/ (Firebase solo con import() dinámico) |` y en "Quién es responsable de qué": `| Avisos push en la web (activar, dar de baja, service worker) | src/push/webPush.ts + public/firebase-messaging-sw.js (ADR-016) |`.

- [ ] **Step 8: Ejecutar todo y commit**

Run: `rtk proxy npx vitest run` → todo PASS; `npx tsc -p tsconfig.app.json --noEmit`; `npm run lint`; `npm run build` (comprobar en la salida que `firebase` sale en un chunk aparte, no en `index-*.js`).

```
feat(push): activar, desactivar y reanudar los avisos web con FCM

src/push/webPush: pide el permiso primero (Safari), registra el service
worker y el token, y lo da de baja al desactivar o al cerrar sesión (antes
de cerrarla en el back). Se reanudan al entrar si ese usuario las tenía.
Service worker propio: muestra el aviso si la web no está a la vista y abre
su enlace. Firebase 12.19.0 cargado solo bajo demanda.
```

---

### Task 5: aviso propio e interruptor

**Files:**
- Create: `src/hooks/useWebPush.ts`, `src/components/push/PushPrompt.tsx`, `src/components/push/PushToggle.tsx`, `src/components/push/PushPrompt.test.tsx`, `src/components/push/PushToggle.test.tsx`
- Modify: `src/pages/HomePage.tsx`, `src/pages/DraftPage.tsx`, `src/pages/MyProfilePage.tsx`, `src/components/UserDrawer.tsx`, `src/index.css`

**Interfaces:**
- Consumes: `webPushStatus`, `shouldPrompt` (Task 3); `readWebPushEnv` (Task 3); `enableWebPush`, `disableWebPush`, `dismissWebPushPrompt`, `isWebPushPromptDismissed` (Task 4).
- Produces: `useWebPush(): { status: WebPushStatus; dismissed: boolean; busy: boolean; enable: () => void; disable: () => void; dismiss: () => void }`; `<PushPrompt context="draft" | "home" />`; `<PushToggle />`.

- [ ] **Step 1: Tests (fallan)**

`src/components/push/PushPrompt.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PushPrompt from './PushPrompt';
import { useAuthStore } from '../../store/authStore';
import { useToastStore } from '../../store/toastStore';
import type { WebPushEnv } from '../../utils/webPush';

let env: WebPushEnv;
vi.mock('../../push/env', () => ({ readWebPushEnv: () => env }));
vi.mock('../../push/webPush', () => ({
  enableWebPush: vi.fn(async () => 'enabled'),
  disableWebPush: vi.fn(async () => {}),
  dismissWebPushPrompt: vi.fn((user: string) => localStorage.setItem(`pf:web-push-dismissed:${user}`, '1')),
  isWebPushPromptDismissed: (user: string) => localStorage.getItem(`pf:web-push-dismissed:${user}`) === '1',
}));
import * as webPush from '../../push/webPush';

const base: WebPushEnv = { native: false, configured: true, supported: true, ios: false, standalone: false, permission: 'default', enabled: false };

describe('PushPrompt', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    env = { ...base };
    useAuthStore.setState({ username: 'ash' });
    useToastStore.setState({ toasts: [] });
  });

  it('ofrece activarlas y "Activar" las activa para ese usuario', async () => {
    render(<PushPrompt context="draft" />);
    expect(screen.getByRole('status')).toHaveTextContent('enterarte de tu turno aunque cierres la página');

    await userEvent.click(screen.getByRole('button', { name: 'Activar' }));

    expect(webPush.enableWebPush).toHaveBeenCalledWith('ash');
    expect(useToastStore.getState().toasts.map((t) => t.message)).toContain('Notificaciones activadas');
  });

  it('"Ahora no" lo oculta y se recuerda', async () => {
    const { unmount } = render(<PushPrompt context="home" />);
    await userEvent.click(screen.getByRole('button', { name: 'Ahora no' }));
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    unmount();

    render(<PushPrompt context="home" />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('si cierra el diálogo del navegador sin elegir, el aviso sigue ahí', async () => {
    vi.mocked(webPush.enableWebPush).mockResolvedValueOnce('off');
    render(<PushPrompt context="draft" />);
    await userEvent.click(screen.getByRole('button', { name: 'Activar' }));
    expect(await screen.findByRole('button', { name: 'Activar' })).toBeEnabled();
  });

  it('en iPhone sin instalar explica cómo añadirla a la pantalla de inicio', () => {
    env = { ...base, ios: true, standalone: false, supported: false };
    render(<PushPrompt context="draft" />);
    expect(screen.getByRole('status')).toHaveTextContent('Añadir a pantalla de inicio');
    expect(screen.queryByRole('button', { name: 'Activar' })).not.toBeInTheDocument();
  });

  it('activadas, bloqueadas, sin Firebase o en la app: no sale', () => {
    for (const patch of [
      { permission: 'granted' as const, enabled: true },
      { permission: 'denied' as const },
      { configured: false },
      { native: true },
    ]) {
      env = { ...base, ...patch };
      const { unmount } = render(<PushPrompt context="draft" />);
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
      unmount();
    }
  });
});
```

`src/components/push/PushToggle.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PushToggle from './PushToggle';
import { useAuthStore } from '../../store/authStore';
import type { WebPushEnv } from '../../utils/webPush';

let env: WebPushEnv;
vi.mock('../../push/env', () => ({ readWebPushEnv: () => env }));
vi.mock('../../push/webPush', () => ({
  enableWebPush: vi.fn(async () => 'enabled'),
  disableWebPush: vi.fn(async () => {}),
  dismissWebPushPrompt: vi.fn(),
  isWebPushPromptDismissed: () => false,
}));
import * as webPush from '../../push/webPush';

const base: WebPushEnv = { native: false, configured: true, supported: true, ios: false, standalone: false, permission: 'granted', enabled: true };

describe('PushToggle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    env = { ...base };
    useAuthStore.setState({ username: 'ash' });
  });

  it('activadas: el interruptor está encendido y apagarlo las desactiva', async () => {
    render(<PushToggle />);
    const toggle = screen.getByRole('switch', { name: 'Notificaciones en este dispositivo' });
    expect(toggle).toHaveAttribute('aria-checked', 'true');
    await userEvent.click(toggle);
    expect(webPush.disableWebPush).toHaveBeenCalledWith('ash');
  });

  it('apagadas: encenderlo las activa', async () => {
    env = { ...base, enabled: false, permission: 'default' };
    render(<PushToggle />);
    await userEvent.click(screen.getByRole('switch', { name: 'Notificaciones en este dispositivo' }));
    expect(webPush.enableWebPush).toHaveBeenCalledWith('ash');
  });

  it('bloqueadas: explica cómo desbloquearlas y no ofrece el interruptor', () => {
    env = { ...base, permission: 'denied', enabled: false };
    render(<PushToggle />);
    expect(screen.queryByRole('switch')).not.toBeInTheDocument();
    expect(screen.getByText(/bloqueado en el navegador/)).toBeInTheDocument();
  });

  it('navegador sin push o iPhone sin instalar: lo dice', () => {
    env = { ...base, supported: false, enabled: false };
    const { unmount } = render(<PushToggle />);
    expect(screen.getByText('Este navegador no admite notificaciones.')).toBeInTheDocument();
    unmount();
    env = { ...base, ios: true, standalone: false, enabled: false };
    render(<PushToggle />);
    expect(screen.getByText(/pantalla de inicio/)).toBeInTheDocument();
  });

  it('en la app o sin Firebase no se pinta nada', () => {
    env = { ...base, native: true };
    const { container } = render(<PushToggle />);
    expect(container).toBeEmptyDOMElement();
  });
});
```

- [ ] **Step 2: Ejecutar y ver que fallan**

Run: `rtk proxy npx vitest run src/components/push` → FAIL.

- [ ] **Step 3: Implementar el hook y los componentes**

`src/hooks/useWebPush.ts`:

```ts
import { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { useToastStore } from '../store/toastStore';
import { webPushStatus, type WebPushStatus } from '../utils/webPush';
import { readWebPushEnv } from '../push/env';
import { disableWebPush, dismissWebPushPrompt, enableWebPush, isWebPushPromptDismissed } from '../push/webPush';

/** Estado y acciones de los avisos push de este navegador para el usuario en sesión. */
export function useWebPush(): {
  status: WebPushStatus; dismissed: boolean; busy: boolean;
  enable: () => void; disable: () => void; dismiss: () => void;
} {
  const username = useAuthStore((s) => s.username);
  const addToast = useToastStore((s) => s.addToast);
  const [busy, setBusy] = useState(false);
  // El estado vive en el navegador (permiso, localStorage): se relee tras cada acción
  const [, setRevision] = useState(0);
  const refresh = () => setRevision((r) => r + 1);

  const status = webPushStatus(readWebPushEnv(username));
  const dismissed = !!username && isWebPushPromptDismissed(username);

  const enable = () => {
    if (!username) return;
    setBusy(true);
    // enableWebPush pide el permiso lo primero: se llama aquí mismo, dentro del clic
    enableWebPush(username)
      .then((result) => {
        if (result === 'enabled') addToast('success', 'Notificaciones activadas');
        if (result === 'blocked') addToast('info', 'Has bloqueado las notificaciones en este navegador');
      })
      .catch(() => addToast('error', 'No se pudieron activar las notificaciones'))
      .finally(() => { setBusy(false); refresh(); });
  };

  const disable = () => {
    if (!username) return;
    setBusy(true);
    disableWebPush(username)
      .then(() => addToast('success', 'Notificaciones desactivadas en este dispositivo'))
      .finally(() => { setBusy(false); refresh(); });
  };

  const dismiss = () => {
    if (!username) return;
    dismissWebPushPrompt(username);
    refresh();
  };

  return { status, dismissed, busy, enable, disable, dismiss };
}
```

`src/components/push/PushPrompt.tsx`:

```tsx
import { useWebPush } from '../../hooks/useWebPush';
import { shouldPrompt } from '../../utils/webPush';

const TEXT = {
  draft: 'Activa las notificaciones para enterarte de tu turno aunque cierres la página.',
  home: 'Activa las notificaciones para enterarte de tu turno, de los robos y de los intercambios aunque cierres la página.',
};

/** Aviso propio antes del permiso del navegador: el permiso solo se pide al pulsar "Activar". */
export default function PushPrompt({ context }: { context: 'draft' | 'home' }) {
  const { status, dismissed, busy, enable, dismiss } = useWebPush();
  if (!shouldPrompt(status, dismissed)) return null;

  if (status === 'needs-install') {
    return (
      <div className="push-prompt" role="status">
        <p className="push-prompt-text">
          Para recibir avisos en el iPhone, añade PokeFantasy a la pantalla de inicio: botón Compartir →
          «Añadir a pantalla de inicio». Ábrela desde ahí y actívalos.
        </p>
        <div className="push-prompt-actions">
          <button type="button" className="btn-ghost" onClick={dismiss}>Entendido</button>
        </div>
      </div>
    );
  }

  return (
    <div className="push-prompt" role="status">
      <p className="push-prompt-text">{TEXT[context]}</p>
      <div className="push-prompt-actions">
        <button type="button" className="btn-ghost" onClick={dismiss} disabled={busy}>Ahora no</button>
        <button type="button" className="btn-primary" onClick={enable} disabled={busy}>
          {busy ? 'Activando...' : 'Activar'}
        </button>
      </div>
    </div>
  );
}
```

`src/components/push/PushToggle.tsx`:

```tsx
import { useWebPush } from '../../hooks/useWebPush';

/** Interruptor de los avisos de este navegador (Mi perfil y panel de la cuenta). */
export default function PushToggle() {
  const { status, busy, enable, disable } = useWebPush();
  if (status === 'hidden') return null;

  if (status === 'unsupported') return <p className="config-hint">Este navegador no admite notificaciones.</p>;
  if (status === 'needs-install') {
    return (
      <p className="config-hint">
        En el iPhone, añade PokeFantasy a la pantalla de inicio (Compartir → «Añadir a pantalla de inicio») y
        actívalas desde ahí.
      </p>
    );
  }
  if (status === 'blocked') {
    return (
      <p className="config-hint">
        Las has bloqueado en el navegador. Para recibirlas, permítelas en los ajustes del sitio (el icono junto
        a la dirección) y recarga la página.
      </p>
    );
  }

  const on = status === 'enabled';
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      className={`push-toggle${on ? ' on' : ''}`}
      onClick={on ? disable : enable}
      disabled={busy}
    >
      <span className="push-toggle-label">Notificaciones en este dispositivo</span>
      <span className="push-toggle-track" aria-hidden="true"><span className="push-toggle-thumb" /></span>
    </button>
  );
}
```

- [ ] **Step 4: Colocarlos**

- `HomePage.tsx`: justo después de la `</section>` del saludo: `{shown.length > 0 && <PushPrompt context="home" />}`.
- `DraftPage.tsx`: justo después del `div.section-header` del título: `{(draft?.status === 'PENDING' || draft?.status === 'IN_PROGRESS') && <PushPrompt context="draft" />}`.
- `MyProfilePage.tsx`: antes de `<p className="section-label" ...>Cuenta</p>`, un componente local:
  ```tsx
  <PushSection />
  ```
  con, en el mismo fichero,
  ```tsx
  /** Sección de avisos: solo si este navegador puede tenerlos (en la app nativa no). */
  function PushSection() {
    const { status } = useWebPush();
    if (status === 'hidden') return null;
    return (
      <>
        <p className="section-label" style={{ margin: '2rem 0 0.75rem' }}>Notificaciones</p>
        <PushToggle />
      </>
    );
  }
  ```
- `UserDrawer.tsx`: dentro de `.user-drawer-footer`, antes del botón de tema: `<PushToggle />`.

`src/index.css` (junto a los estilos de `Notice`):

```css
/* Avisos push: aviso propio e interruptor */
.push-prompt {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem 1rem;
  margin-bottom: 1.25rem;
  padding: 0.85rem 1rem;
  background: var(--accent-dim);
  border: 1px solid var(--accent-glow);
  border-radius: var(--radius);
}
.push-prompt-text { flex: 1 1 16rem; margin: 0; font-size: 0.875rem; color: var(--text); }
.push-prompt-actions { display: flex; gap: 0.5rem; margin-left: auto; }
.push-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  width: 100%;
  min-height: 44px;
  padding: 0.5rem 0.75rem;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--text);
  font: inherit;
  font-size: 0.9rem;
  cursor: pointer;
  text-align: left;
}
.push-toggle:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
.push-toggle-track {
  position: relative;
  flex-shrink: 0;
  width: 2.5rem;
  height: 1.4rem;
  border-radius: 999px;
  background: var(--surface-2);
  border: 1px solid var(--border);
  transition: background 0.15s;
}
.push-toggle-thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: calc(1.4rem - 6px);
  height: calc(1.4rem - 6px);
  border-radius: 50%;
  background: var(--text-2);
  transition: transform 0.15s;
}
.push-toggle.on .push-toggle-track { background: var(--accent-dim); border-color: var(--accent); }
.push-toggle.on .push-toggle-thumb { transform: translateX(1.1rem); background: var(--accent); }
@media (prefers-reduced-motion: reduce) {
  .push-toggle-track, .push-toggle-thumb { transition: none; }
}
```

- [ ] **Step 5: Ejecutar todo**

Run: `rtk proxy npx vitest run` → PASS (los tests de `HomePage`, `DraftPage`, `MyProfilePage` y `PageHeader` no tienen Firebase configurado: `PushPrompt`/`PushToggle` no pintan nada y siguen pasando). `npx tsc -p tsconfig.app.json --noEmit`, `npm run lint`, `npm run build`.

- [ ] **Step 6: Commit**

```
feat(push): aviso para activar las notificaciones e interruptor por dispositivo

PushPrompt en el Draft (preparación y en curso) y en la home: "Activar" pide
el permiso del navegador; "Ahora no" se recuerda por usuario y dispositivo;
en iPhone sin instalar explica cómo añadirla a la pantalla de inicio.
PushToggle en Mi perfil y en el panel de la cuenta; bloqueadas o sin
soporte, lo explica.
```

---

### Task 6: documentación, configuración y PR

**Files:**
- Vault (`C:\PokeFantasy\vault`, commits directos a `main`): Create `70 Decisiones/ADR-016 Push en la web con FCM.md`; Modify `50 Features/Notificaciones.md`, `20 Arquitectura/Tiempo real.md`, `20 Arquitectura/API REST.md`, `40 Frontend/Estructura frontend.md`, `60 Operaciones/Deploy.md`.

- [ ] **Step 1: ADR-016** (desde `Plantillas/Plantilla Decisión.md`): contexto (avisos solo con la página abierta; iPhone solo con la web instalada), decisión (FCM en la web con el SDK bajo demanda y service worker propio; token en `fcmTokens` como la app; un token es de un solo usuario; baja al desactivar y al cerrar sesión), alternativa descartada (Web Push estándar con VAPID propias: segundo camino de envío y otra librería en el back), consecuencias (dependencia `firebase` en la web, cinco `VITE_FIREBASE_*`, `WEB_URL` en el back, sin caché offline).

- [ ] **Step 2: Notas**
  - `Notificaciones.md`: la tabla gana la columna "Push (web)" con ✅ en las cuatro filas; cómo se activan (aviso en Draft y home, interruptor en Mi perfil y panel), iPhone con la web instalada, baja al cerrar sesión; `prs_back`/`prs_front` con los números nuevos.
  - `Tiempo real.md`: sección "Push FCM" pasa a "(app Android y web)": `PushMessage` con ruta y etiqueta, `WebpushConfig`, `WEB_URL`, service worker `public/firebase-messaging-sw.js`, token de un solo usuario, `DELETE /v1/users/push-token`.
  - `API REST.md`: fila `DELETE /v1/users/push-token` (dar de baja este dispositivo).
  - `Estructura frontend.md`: carpeta `src/push/` y `public/firebase-messaging-sw.js`, `manifest.webmanifest`, `public/icons/`.
  - `Deploy.md`: variables nuevas — Netlify: `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`, `VITE_FIREBASE_VAPID_KEY`; Render: `WEB_URL` (opcional). Pasos en la consola de Firebase: Configuración del proyecto → Tus apps → Añadir app web (copiar `apiKey`, `projectId`, `messagingSenderId`, `appId`); Cloud Messaging → Configuración web → Certificados de push web → Generar par de claves (la pública es `VITE_FIREBASE_VAPID_KEY`).

- [ ] **Step 3: Comprobación final y PR**

Run: `rtk proxy npx vitest run`, `npx tsc -p tsconfig.app.json --noEmit`, `npm run lint`, `npm run build`. Push de `feature/push-web` y PR contra `main` (`node C:\Users\mallu\AppData\Local\Temp\claude\C--PokeFantasy\1c30755d-3b1d-434b-8384-9f3bc6d7be5d\scratchpad/create-pr.mjs pokefantasy-web feature/push-web main "<título>" <cuerpo.md>` tras `. $PROFILE`). El cuerpo lista las cinco tareas, dice que va después del PR del back, y deja claro qué tiene que configurar el usuario en Firebase y Netlify y cómo probarlo (PC y Android en el navegador; iPhone con la web añadida a la pantalla de inicio).
