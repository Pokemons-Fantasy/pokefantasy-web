# Dark/Light Toggle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a sun/moon toggle button to every page header that switches between dark and light themes, persisted in localStorage.

**Architecture:** A `useTheme` hook manages state + localStorage + applies/removes `theme-light` class on `<html>`. A new `<PageHeader>` component owns the header markup and the toggle button; all 11 protected pages replace their inline `<header>` blocks with `<PageHeader>`. Two props handle variation: `left?: ReactNode` (back button + logo vs logo-only) and `rightExtra?: ReactNode` (TeamsPage needs an Intercambios button before the standard controls).

**Tech Stack:** React 19, TypeScript, CSS custom properties, Vite, localStorage

---

## File Map

| File | Change |
|------|--------|
| `index.html` | Add inline script before `</head>` to prevent flash |
| `src/index.css` | Add `.theme-light {}` block after `:root {}` |
| `src/hooks/useTheme.ts` | New — theme state + localStorage + DOM class |
| `src/components/PageHeader.tsx` | New — shared header with toggle |
| `src/pages/HomePage.tsx` | Replace `<header>` with `<PageHeader />` |
| `src/pages/LeaguesPage.tsx` | Replace `<header>` with `<PageHeader />` |
| `src/pages/LeagueDetailPage.tsx` | Replace both `<header>` blocks (loading + normal) |
| `src/pages/PoolPage.tsx` | Replace `<header>` with `<PageHeader left={...} />` |
| `src/pages/DraftPage.tsx` | Replace `<header>` with `<PageHeader left={...} />` |
| `src/pages/SchedulePage.tsx` | Replace `<header>` with `<PageHeader left={...} />` |
| `src/pages/LeagueConfigPage.tsx` | Replace `<header>` with `<PageHeader left={...} />` |
| `src/pages/TierManagementPage.tsx` | Replace `<header>` with `<PageHeader left={...} />` |
| `src/pages/ActivityPage.tsx` | Replace `<header>` with `<PageHeader left={...} />` |
| `src/pages/StandingsPage.tsx` | Replace `<header>` with `<PageHeader left={...} />` |
| `src/pages/TeamsPage.tsx` | Replace `<header>` with `<PageHeader left={...} rightExtra={...} />` |

---

## Task 1: CSS foundation + flash prevention

**Files:**
- Modify: `src/index.css` (after line 22, after the closing `}` of `:root`)
- Modify: `index.html` (before `</head>`)

- [ ] **Step 1: Add `.theme-light` block to `src/index.css`**

Insert this block immediately after the `:root { ... }` closing brace (after line 22):

```css
.theme-light {
  --bg: #f4f4f8;
  --surface: #ffffff;
  --surface-2: #ebebf2;
  --border: rgba(0, 0, 0, 0.08);
  --border-hover: rgba(0, 0, 0, 0.15);
  --text: #18181b;
  --text-2: #52525b;
  --text-3: #a1a1aa;
  --shadow-lg: 0 8px 32px rgba(0, 0, 0, 0.12);
  --accent-dim: rgba(251, 191, 36, 0.15);
  --accent-glow: rgba(251, 191, 36, 0.3);
}
```

`--accent`, `--green`, `--red`, `--blue`, `--radius`, `--radius-sm` are intentionally NOT overridden — they are identical in both themes.

- [ ] **Step 2: Add flash-prevention script to `index.html`**

`index.html` is at `C:\PokeFantasy\pokefantasy-web\index.html`. Add this script block immediately before `</head>`:

```html
  <script>
    if (localStorage.getItem('pf-theme') === 'light') {
      document.documentElement.classList.add('theme-light');
    }
  </script>
```

This runs synchronously before React hydrates, so users who saved `light` never see the dark theme flash in.

- [ ] **Step 3: Build check**

```powershell
cd C:\PokeFantasy\pokefantasy-web; npm run build
```

Expected: `✓ built in ...ms` with no errors.

- [ ] **Step 4: Commit**

```powershell
cd C:\PokeFantasy\pokefantasy-web
git add src/index.css index.html
git commit -m "feat: add theme-light CSS vars and flash-prevention script"
```

---

## Task 2: `useTheme` hook

**Files:**
- Create: `src/hooks/useTheme.ts`

- [ ] **Step 1: Create the hook**

Create `C:\PokeFantasy\pokefantasy-web\src\hooks\useTheme.ts`:

```ts
import { useState, useEffect } from 'react';

export type Theme = 'dark' | 'light';

const STORAGE_KEY = 'pf-theme';

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(
    () => (localStorage.getItem(STORAGE_KEY) as Theme) ?? 'dark'
  );

  useEffect(() => {
    document.documentElement.classList.toggle('theme-light', theme === 'light');
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const toggle = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'));

  return { theme, toggle };
}
```

- [ ] **Step 2: TypeScript check**

```powershell
cd C:\PokeFantasy\pokefantasy-web; npx tsc --noEmit
```

Expected: no output (0 errors).

- [ ] **Step 3: Commit**

```powershell
cd C:\PokeFantasy\pokefantasy-web
git add src/hooks/useTheme.ts
git commit -m "feat: add useTheme hook with localStorage persistence"
```

---

## Task 3: `PageHeader` component

**Files:**
- Create: `src/components/PageHeader.tsx`

- [ ] **Step 1: Create the component**

Create `C:\PokeFantasy\pokefantasy-web\src\components\PageHeader.tsx`:

```tsx
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useTheme } from '../hooks/useTheme';

interface PageHeaderProps {
  /** Custom left side. Defaults to plain logo linking to '/'. */
  left?: ReactNode;
  /** Extra buttons inserted before the theme toggle in header-right. */
  rightExtra?: ReactNode;
}

export default function PageHeader({ left, rightExtra }: PageHeaderProps) {
  const navigate = useNavigate();
  const username = useAuthStore((s) => s.username);
  const logout   = useAuthStore((s) => s.logout);
  const { theme, toggle } = useTheme();

  return (
    <header className="page-header">
      <div className="page-header-inner">
        {left ?? (
          <span
            className="logo"
            style={{ cursor: 'pointer' }}
            onClick={() => navigate('/')}
          >
            PokeFantasy
          </span>
        )}
        <div className="header-right">
          {rightExtra}
          <button
            className="btn-ghost"
            style={{ padding: '0.3rem 0.55rem', fontSize: '1rem', lineHeight: 1 }}
            onClick={toggle}
            title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
          <span className="header-user">
            Hola, <strong>{username}</strong>
          </span>
          <button className="btn-ghost" onClick={logout}>
            Cerrar sesión
          </button>
        </div>
      </div>
    </header>
  );
}
```

- [ ] **Step 2: TypeScript check**

```powershell
cd C:\PokeFantasy\pokefantasy-web; npx tsc --noEmit
```

Expected: no output (0 errors).

- [ ] **Step 3: Commit**

```powershell
cd C:\PokeFantasy\pokefantasy-web
git add src/components/PageHeader.tsx
git commit -m "feat: add PageHeader component with theme toggle"
```

---

## Task 4: Pages without back button — HomePage and LeaguesPage

These pages have a simple header with just the logo on the left. Replace with `<PageHeader />` (no props needed).

**Files:**
- Modify: `src/pages/HomePage.tsx`
- Modify: `src/pages/LeaguesPage.tsx`

- [ ] **Step 1: Update `HomePage.tsx`**

Add import at top:
```tsx
import PageHeader from '../components/PageHeader';
```

Replace the entire `<header className="page-header">…</header>` block (lines 37–45) with:
```tsx
      <PageHeader />
```

The existing `logout` destructure from `useAuthStore` is now unused in this file — remove it:

Change:
```tsx
  const logout = useAuthStore((s) => s.logout);
```
To: delete this line (logout is now handled by PageHeader).

- [ ] **Step 2: Update `LeaguesPage.tsx`**

Add import at top:
```tsx
import PageHeader from '../components/PageHeader';
```

Replace the entire `<header className="page-header">…</header>` block with:
```tsx
      <PageHeader />
```

Remove the `logout` destructure if it's only used in the header (check the file — if `logout` appears elsewhere, keep it).

- [ ] **Step 3: TypeScript check**

```powershell
cd C:\PokeFantasy\pokefantasy-web; npx tsc --noEmit
```

Expected: no output.

- [ ] **Step 4: Commit**

```powershell
cd C:\PokeFantasy\pokefantasy-web
git add src/pages/HomePage.tsx src/pages/LeaguesPage.tsx
git commit -m "feat: use PageHeader in HomePage and LeaguesPage"
```

---

## Task 5: LeagueDetailPage (two header blocks)

`LeagueDetailPage` has two early-return paths that each render their own `<header>`: the loading state and the normal render. Both need updating.

**Files:**
- Modify: `src/pages/LeagueDetailPage.tsx`

- [ ] **Step 1: Add import**

```tsx
import PageHeader from '../components/PageHeader';
```

- [ ] **Step 2: Replace loading-state header (around line 103)**

The loading early return currently renders:
```tsx
      <header className="page-header">
        <div className="page-header-inner">
          <span className="logo" onClick={() => navigate('/leagues')}>PokeFantasy</span>
        </div>
      </header>
```

Replace with:
```tsx
      <PageHeader />
```

- [ ] **Step 3: Replace main header (around line 127)**

The normal render currently has:
```tsx
      <header className="page-header">
        <div className="page-header-inner">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button className="btn-back" onClick={() => navigate('/leagues')}>← Mis ligas</button>
            <span className="logo" onClick={() => navigate('/leagues')}>PokeFantasy</span>
          </div>
          <div className="header-right">
            <span className="header-user">Hola, <strong>{username}</strong></span>
            <button className="btn-ghost" onClick={logout}>Cerrar sesión</button>
          </div>
        </div>
      </header>
```

Replace with:
```tsx
      <PageHeader left={
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button className="btn-back" onClick={() => navigate('/leagues')}>← Mis ligas</button>
          <span className="logo" onClick={() => navigate('/leagues')}>PokeFantasy</span>
        </div>
      } />
```

- [ ] **Step 4: Remove unused `logout` destructure if applicable**

Check if `logout` is used anywhere else in the file besides the old header. If not, remove:
```tsx
const logout = useAuthStore((s) => s.logout);
```

- [ ] **Step 5: TypeScript check**

```powershell
cd C:\PokeFantasy\pokefantasy-web; npx tsc --noEmit
```

- [ ] **Step 6: Commit**

```powershell
cd C:\PokeFantasy\pokefantasy-web
git add src/pages/LeagueDetailPage.tsx
git commit -m "feat: use PageHeader in LeagueDetailPage"
```

---

## Task 6: Standard back-button pages (7 pages)

These pages all share the same header pattern: back button (`← Liga`) + logo on left, username + logout on right. Only the back button's `onClick` target differs.

**Files:**
- Modify: `src/pages/PoolPage.tsx`
- Modify: `src/pages/DraftPage.tsx`
- Modify: `src/pages/SchedulePage.tsx`
- Modify: `src/pages/LeagueConfigPage.tsx`
- Modify: `src/pages/TierManagementPage.tsx`
- Modify: `src/pages/ActivityPage.tsx`
- Modify: `src/pages/StandingsPage.tsx`

For each page, the change is identical in structure — only the button text and navigate target varies.

- [ ] **Step 1: Update `PoolPage.tsx`**

Add import:
```tsx
import PageHeader from '../components/PageHeader';
```

Replace `<header>...</header>` with:
```tsx
      <PageHeader left={
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button className="btn-back" onClick={() => navigate(`/leagues/${leagueId}`)}>← Liga</button>
          <span className="logo" onClick={() => navigate('/leagues')}>PokeFantasy</span>
        </div>
      } />
```

- [ ] **Step 2: Update `DraftPage.tsx`**

Add import:
```tsx
import PageHeader from '../components/PageHeader';
```

Replace `<header>...</header>` with:
```tsx
      <PageHeader left={
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button className="btn-back" onClick={() => navigate(`/leagues/${leagueId}`)}>← Liga</button>
          <span className="logo" onClick={() => navigate('/leagues')}>PokeFantasy</span>
        </div>
      } />
```

- [ ] **Step 3: Update `SchedulePage.tsx`**

Add import:
```tsx
import PageHeader from '../components/PageHeader';
```

Replace `<header>...</header>` with:
```tsx
      <PageHeader left={
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button className="btn-back" onClick={() => navigate(`/leagues/${leagueId}`)}>← Liga</button>
          <span className="logo" onClick={() => navigate('/leagues')}>PokeFantasy</span>
        </div>
      } />
```

- [ ] **Step 4: Update `LeagueConfigPage.tsx`**

Add import:
```tsx
import PageHeader from '../components/PageHeader';
```

Replace `<header>...</header>` with:
```tsx
      <PageHeader left={
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button className="btn-back" onClick={() => navigate(`/leagues/${leagueId}`)}>← Liga</button>
          <span className="logo" onClick={() => navigate('/leagues')}>PokeFantasy</span>
        </div>
      } />
```

- [ ] **Step 5: Update `TierManagementPage.tsx`**

Add import:
```tsx
import PageHeader from '../components/PageHeader';
```

Replace `<header>...</header>` with:
```tsx
      <PageHeader left={
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button className="btn-back" onClick={() => navigate(`/leagues/${leagueId}`)}>Ligas</button>
          <span className="logo" onClick={() => navigate('/leagues')}>PokeFantasy</span>
        </div>
      } />
```

Note: TierManagementPage uses "Ligas" (no arrow) — preserve that text.

- [ ] **Step 6: Update `ActivityPage.tsx`**

Add import:
```tsx
import PageHeader from '../components/PageHeader';
```

Replace `<header>...</header>` with:
```tsx
      <PageHeader left={
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button className="btn-back" onClick={() => navigate(`/leagues/${leagueId}`)}>← Liga</button>
          <span className="logo" onClick={() => navigate('/leagues')}>PokeFantasy</span>
        </div>
      } />
```

- [ ] **Step 7: Update `StandingsPage.tsx`**

Add import:
```tsx
import PageHeader from '../components/PageHeader';
```

Replace `<header>...</header>` with:
```tsx
      <PageHeader left={
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button className="btn-back" onClick={() => navigate(`/leagues/${leagueId}`)}>← Liga</button>
          <span className="logo" onClick={() => navigate('/leagues')}>PokeFantasy</span>
        </div>
      } />
```

- [ ] **Step 8: TypeScript check**

```powershell
cd C:\PokeFantasy\pokefantasy-web; npx tsc --noEmit
```

Expected: no output.

- [ ] **Step 9: Commit**

```powershell
cd C:\PokeFantasy\pokefantasy-web
git add src/pages/PoolPage.tsx src/pages/DraftPage.tsx src/pages/SchedulePage.tsx src/pages/LeagueConfigPage.tsx src/pages/TierManagementPage.tsx src/pages/ActivityPage.tsx src/pages/StandingsPage.tsx
git commit -m "feat: use PageHeader in league sub-pages"
```

---

## Task 7: TeamsPage (has `rightExtra`)

TeamsPage adds an "Intercambios" button with a pending-count badge in `header-right`, before the logout button. This goes in `rightExtra`.

**Files:**
- Modify: `src/pages/TeamsPage.tsx`

- [ ] **Step 1: Add import**

```tsx
import PageHeader from '../components/PageHeader';
```

- [ ] **Step 2: Replace `<header>...</header>`**

The existing header block (around line 387) is:
```tsx
      <header className="page-header">
        <div className="page-header-inner">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button className="btn-back" onClick={() => navigate(`/leagues/${leagueId}/draft`)}>
              ← Draft
            </button>
            <span className="logo" onClick={() => navigate('/leagues')}>PokeFantasy</span>
          </div>
          <div className="header-right">
            <span className="header-user">Hola, <strong>{username}</strong></span>
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
                    background: 'var(--accent)', color: '#fff',
                    fontSize: '0.65rem', fontWeight: 700,
                    borderRadius: '50%', width: 18, height: 18,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {pendingIncomingCount}
                  </span>
                )}
              </button>
            )}
            <button className="btn-ghost" onClick={logout}>Cerrar sesión</button>
          </div>
        </div>
      </header>
```

Replace with:
```tsx
      <PageHeader
        left={
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button className="btn-back" onClick={() => navigate(`/leagues/${leagueId}/draft`)}>
              ← Draft
            </button>
            <span className="logo" onClick={() => navigate('/leagues')}>PokeFantasy</span>
          </div>
        }
        rightExtra={isDraftCompleted ? (
          <button
            className="btn-ghost"
            style={{ position: 'relative' }}
            onClick={() => setShowTradesModal(true)}
          >
            Intercambios
            {pendingIncomingCount > 0 && (
              <span style={{
                position: 'absolute', top: -6, right: -6,
                background: 'var(--accent)', color: '#fff',
                fontSize: '0.65rem', fontWeight: 700,
                borderRadius: '50%', width: 18, height: 18,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {pendingIncomingCount}
              </span>
            )}
          </button>
        ) : undefined}
      />
```

- [ ] **Step 3: TypeScript check**

```powershell
cd C:\PokeFantasy\pokefantasy-web; npx tsc --noEmit
```

Expected: no output.

- [ ] **Step 4: Build check**

```powershell
cd C:\PokeFantasy\pokefantasy-web; npm run build
```

Expected: `✓ built in ...ms`.

- [ ] **Step 5: Commit**

```powershell
cd C:\PokeFantasy\pokefantasy-web
git add src/pages/TeamsPage.tsx
git commit -m "feat: use PageHeader in TeamsPage with Intercambios rightExtra"
```

---

## Task 8: Branch + PR

- [ ] **Step 1: Verify branch**

All commits above should be on a feature branch. If they were made on `main` by mistake, create a branch now:
```powershell
cd C:\PokeFantasy\pokefantasy-web
git log --oneline -8
```
Commits should show the 5 `feat:` commits from Tasks 1–7.

- [ ] **Step 2: Create branch if needed and push**

```powershell
git checkout -b feature/dark-light-toggle
git push origin feature/dark-light-toggle
```

If already on a feature branch:
```powershell
git push origin feature/dark-light-toggle
```

- [ ] **Step 3: Create PR via GitHub API**

```powershell
$token = $env:GITHUB_TOKEN
$body = @{
  title = "[frontend] Dark/light theme toggle"
  head  = "feature/dark-light-toggle"
  base  = "main"
  body  = "Adds sun/moon toggle button to all page headers. Uses CSS custom properties under `.theme-light` class on `<html>`. Persists choice in `localStorage`. Flash prevention via inline script in `index.html`."
} | ConvertTo-Json

Invoke-RestMethod `
  -Uri "https://api.github.com/repos/Pokemons-Fantasy/pokefantasy-web/pulls" `
  -Method POST `
  -Headers @{ Authorization = "Bearer $token"; "Content-Type" = "application/json" } `
  -Body $body
```

---

## Manual verification checklist

- [ ] Dark theme loads by default on first visit (no `pf-theme` in localStorage)
- [ ] Clicking ☀️ switches to light theme instantly
- [ ] Clicking 🌙 switches back to dark theme
- [ ] Theme persists after page refresh (hard reload)
- [ ] Theme persists when navigating between pages (LeaguesPage → DraftPage → TeamsPage etc.)
- [ ] No dark→light flash when reloading in light mode
- [ ] "Intercambios" button still appears in TeamsPage header when draft is completed
- [ ] All pages show the toggle button (verify at least: HomePage, DraftPage, TeamsPage)
