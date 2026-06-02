# Capacitor Android Setup — Design

## Goal

Envolver el proyecto React existente (`pokefantasy-web`) con Capacitor para generar un APK de Android distribuible directamente (sideload). iOS queda pendiente para cuando haya acceso a Mac + Apple Developer account.

## Constraints

- Solo Windows disponible para compilar — Android Studio en Windows.
- Sin Apple Developer account de momento — iOS fuera de scope.
- El deploy web (Netlify) no debe verse afectado.
- No reescribir UI — Capacitor usa el WebView con el React existente.

## Architecture

```
pokefantasy-web/
├── src/                   (sin cambios)
├── dist/                  (output de Vite — Capacitor lo lee aquí)
├── android/               (proyecto Android Studio — commiteado)
│   ├── app/
│   └── ...
├── capacitor.config.ts    (NUEVO — config principal de Capacitor)
├── index.html             (MODIFICADO — viewport-fit=cover)
├── package.json           (MODIFICADO — scripts cap:sync, cap:build)
└── .gitignore             (MODIFICADO — ignorar android/build, android/.gradle)
```

Flujo de build:
```
npm run build        →  genera dist/
npx cap sync android →  copia dist/ a android/app/src/main/assets/public/
Android Studio       →  compila APK / AAB
```

## Capacitor config (`capacitor.config.ts`)

```ts
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.pokefantasy.app',
  appName: 'PokeFantasy',
  webDir: 'dist',
  android: {
    buildOptions: {
      releaseType: 'APK',
    },
  },
  server: {
    androidScheme: 'https',
  },
};

export default config;
```

`androidScheme: 'https'` es importante: hace que las cookies y localStorage funcionen correctamente en Android WebView moderno (API 30+). Sin esto puede haber problemas con Zustand/auth.

## Dependencias nuevas

```
@capacitor/core       — runtime compartido
@capacitor/cli        — herramienta CLI (npx cap ...)
@capacitor/android    — plataforma Android
@capacitor/clipboard  — reemplaza navigator.clipboard (falla en WebView Android)
```

## Cambios en archivos existentes

### `index.html`
Cambiar viewport meta para soporte de safe areas (notch, barra de navegación Android):
```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
```

### `package.json` — scripts añadidos
```json
"cap:sync": "npm run build && npx cap sync android",
"cap:open": "npx cap open android"
```

### `.gitignore` — añadir
```
android/.gradle/
android/build/
android/app/build/
android/local.properties
```

## Clipboard nativo

`navigator.clipboard.writeText()` falla silenciosamente en WebViews Android sin HTTPS real. Se reemplaza con `@capacitor/clipboard` en dos sitios:

1. **Exportar a Showdown** (`TeamsPage.tsx`) — botón "📋 Showdown"
2. **Copiar link de invitación** (`LeagueDetailPage.tsx`) — botón "🔗 Copiar link"

Patrón:
```ts
import { Clipboard } from '@capacitor/clipboard';

await Clipboard.write({ string: text });
```

Funciona tanto en web como en nativo sin detección de plataforma.

## Out of scope

- iOS (`ios/` carpeta) — se añade cuando haya Mac + Apple Developer account
- Push notifications — PR separado
- Status bar / haptics — PRs separados
- Publicación en Play Store — fuera de scope por ahora (APK directo)
- Firma release del APK — se hace manualmente en Android Studio para el APK de distribución
