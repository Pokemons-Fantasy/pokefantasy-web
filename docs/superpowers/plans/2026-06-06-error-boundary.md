# Error Boundary Global Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Añadir un `ErrorBoundary` global con reset automático por ruta para capturar crashes de componentes sin dejar al usuario en pantalla en blanco.

**Architecture:** Un class component `ErrorBoundary` wrappea `<Routes>` dentro de un helper funcional `ErrorBoundaryWithReset` que le pasa `key={location.pathname}` — cada cambio de ruta desmonta/remonta el boundary, limpiando el estado de error. El fallback muestra una pantalla centrada con los tokens CSS existentes, mensaje genérico, `error.message` solo en DEV, y dos botones de recuperación.

**Tech Stack:** React 19, TypeScript, Vite (`import.meta.env.DEV`), CSS tokens existentes (`var(--surface-2)`, `var(--red)`, `var(--accent)`, `var(--text-1)`, `var(--text-2)`).

---

### Task 1: Crear `ErrorBoundary.tsx`

**Files:**
- Create: `src/components/ErrorBoundary.tsx`

- [ ] **Step 1: Crear el componente**

Crear `src/components/ErrorBoundary.tsx` con el siguiente contenido completo:

```tsx
import { Component } from 'react';
import type { ReactNode, ErrorInfo } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

function FallbackScreen({ error }: { error: Error | null }) {
  return (
    <div className="page-wrapper">
      <main className="page-content" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', textAlign: 'center', gap: '1rem' }}>
        <div style={{ fontSize: '3rem' }}>⚠️</div>
        <h1 className="page-title" style={{ color: 'var(--red)' }}>Algo ha ido mal</h1>
        <p style={{ color: 'var(--text-2)', fontSize: '0.9rem', maxWidth: '28rem' }}>
          Se ha producido un error inesperado. Puedes intentar recargar la página o volver al inicio.
        </p>
        {import.meta.env.DEV && error && (
          <pre style={{
            background: 'var(--surface-2)',
            color: 'var(--text-2)',
            fontSize: '0.75rem',
            padding: '0.75rem 1rem',
            borderRadius: '0.5rem',
            maxWidth: '32rem',
            overflowX: 'auto',
            textAlign: 'left',
          }}>
            {error.message}
          </pre>
        )}
        <div className="modal-actions" style={{ marginTop: '0.5rem' }}>
          <button
            className="btn-secondary"
            onClick={() => { window.location.href = '/'; }}
          >
            ← Inicio
          </button>
          <button
            className="btn-primary"
            onClick={() => window.location.reload()}
          >
            Recargar página
          </button>
        </div>
      </main>
    </div>
  );
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return <FallbackScreen error={this.state.error} />;
    }
    return this.props.children;
  }
}
```

- [ ] **Step 2: TypeScript check**

```powershell
cd C:\PokeFantasy\pokefantasy-web
node_modules/.bin/tsc --noEmit
```

Esperado: sin errores.

- [ ] **Step 3: Commit**

```powershell
git add src/components/ErrorBoundary.tsx
$msg = @'
feat: add ErrorBoundary class component with dev error details
'@
git commit -m $msg
```

---

### Task 2: Integrar `ErrorBoundaryWithReset` en `App.tsx`

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Añadir imports y helper en `App.tsx`**

En `src/App.tsx`, añadir el import de `ErrorBoundary` y `useLocation` justo después de los imports existentes de React Router:

```tsx
// Línea existente:
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
// Cambiar a:
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
```

Añadir import de `ErrorBoundary` junto a los otros imports de componentes:

```tsx
import ErrorBoundary from './components/ErrorBoundary';
```

- [ ] **Step 2: Añadir `ErrorBoundaryWithReset` antes de `App`**

Añadir esta función justo antes de `export default function App()`:

```tsx
function ErrorBoundaryWithReset({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  return <ErrorBoundary key={location.pathname}>{children}</ErrorBoundary>;
}
```

- [ ] **Step 3: Wrapear `<Routes>` con `<ErrorBoundaryWithReset>`**

Localizar el bloque `<Routes>...</Routes>` dentro del `return` de `App` y envolverlo:

```tsx
// Antes:
<Routes>
  <Route path="/login" element={<LoginPage />} />
  ...
</Routes>

// Después:
<ErrorBoundaryWithReset>
  <Routes>
    <Route path="/login" element={<LoginPage />} />
    ...
  </Routes>
</ErrorBoundaryWithReset>
```

El resto del JSX (`<ToastContainer />`, `<DeepLinkHandler />`, `<GlobalNotifications />`, el div de versión) no cambia.

- [ ] **Step 4: TypeScript check**

```powershell
node_modules/.bin/tsc --noEmit
```

Esperado: sin errores.

- [ ] **Step 5: Verificación manual**

Añadir temporalmente `throw new Error('test boundary')` en el render de cualquier página (p.ej. primera línea de `LeaguesPage`), arrancar el dev server y comprobar:

1. La pantalla de error aparece con el icono ⚠️ y el mensaje genérico.
2. En dev: `error.message` "test boundary" visible en el bloque `<pre>`.
3. Pulsar "← Inicio" → navega a `/` y la pantalla desaparece (el boundary se resetea al cambiar el `key`).
4. Pulsar "Recargar página" → la app se reinicia.

Eliminar el `throw` tras verificar.

- [ ] **Step 6: Commit + push + PR**

```powershell
git add src/App.tsx
$msg = @'
feat: wrap routes with ErrorBoundaryWithReset for crash recovery

Key-based reset clears boundary state on every route change so a crash
in one page does not bleed into subsequent navigation.
'@
git commit -m $msg
git push -u origin feature/error-boundary
```

Crear PR via GitHub API (frontend → `main`):

```powershell
. $PROFILE
$h = @{ Authorization = "Bearer $env:GITHUB_TOKEN"; Accept = "application/vnd.github+json" }
$body = "Error boundary global con reset por ruta. Captura crashes sin pantalla en blanco." | ConvertTo-Json -Compress
$pr = [ordered]@{ title = "feat: error boundary global con reset por ruta"; head = "feature/error-boundary"; base = "main"; body = $body } | ConvertTo-Json
Invoke-RestMethod "https://api.github.com/repos/Pokemons-Fantasy/pokefantasy-web/pulls" -Method Post -Headers $h -Body $pr -ContentType "application/json; charset=utf-8"
```

---

## Verificación final

| Check | Comando |
|-------|---------|
| TypeScript | `node_modules/.bin/tsc --noEmit` → 0 errores |
| Crash capturado | `throw` en render → pantalla ⚠️ en lugar de blanco |
| Reset por ruta | Navegar tras crash → boundary limpio |
| Sin `error.message` en prod | `import.meta.env.PROD` → bloque `<pre>` no visible |
| Botones funcionan | "← Inicio" y "Recargar página" operativos |
