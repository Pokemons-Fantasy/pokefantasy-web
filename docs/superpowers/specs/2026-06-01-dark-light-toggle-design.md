# Dark/Light Toggle Design

**Date:** 2026-06-01
**Scope:** Frontend only — `index.html`, `index.css`, new hook, new component, 11 page files

## Problem

The app is dark-only. Some users prefer a light theme. Adding a toggle lets each user choose and persist their preference.

## Goal

A sun/moon button in the header of every protected page. Clicking it switches between the dark theme (current) and a light theme. Choice persists in `localStorage`.

---

## Architecture

### Why `<PageHeader>` instead of Layout + Outlet

9 of 11 protected pages have a custom left side (back button + logo). A shared `<Layout>` via `<Outlet>` would require either: (a) a `HeaderLeftSlot` context — verbose, adds effect calls to each page; or (b) moving all back buttons into `page-content` — changes visual layout across the whole app. A `<PageHeader left?: ReactNode>` component is simpler: pages keep their `page-wrapper`, replace their `<header>` with `<PageHeader>`, and inject their custom left side via a prop.

---

## New files

### `src/hooks/useTheme.ts`

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

### `src/components/PageHeader.tsx`

```tsx
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useTheme } from '../hooks/useTheme';

interface PageHeaderProps {
  /** Custom left content. Defaults to plain PokeFantasy logo linking to '/'. */
  left?: ReactNode;
}

export default function PageHeader({ left }: PageHeaderProps) {
  const navigate = useNavigate();
  const username = useAuthStore((s) => s.username);
  const logout   = useAuthStore((s) => s.logout);
  const { theme, toggle } = useTheme();

  return (
    <header className="page-header">
      <div className="page-header-inner">
        {left ?? (
          <span className="logo" style={{ cursor: 'pointer' }} onClick={() => navigate('/')}>
            PokeFantasy
          </span>
        )}
        <div className="header-right">
          <button
            className="btn-ghost"
            style={{ padding: '0.3rem 0.55rem', fontSize: '1rem', lineHeight: 1 }}
            onClick={toggle}
            title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
          <span className="header-user">Hola, <strong>{username}</strong></span>
          <button className="btn-ghost" onClick={logout}>Cerrar sesión</button>
        </div>
      </div>
    </header>
  );
}
```

---

## Modified files

### `index.html` — flash prevention

Add before `</head>`:
```html
<script>
  if (localStorage.getItem('pf-theme') === 'light') {
    document.documentElement.classList.add('theme-light');
  }
</script>
```

This runs synchronously before React hydrates, preventing the dark→light flash on page load.

### `src/index.css` — light theme vars

Add after the `:root {}` block:
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

`--accent`, `--green`, `--red`, `--blue`, `--radius`, `--radius-sm` are identical in both themes.

### Each protected page (11 files)

Replace the `<header className="page-header">…</header>` block with `<PageHeader>`.

Pages without back button (HomePage, LeaguesPage):
```tsx
<PageHeader />
```

Pages with back button (example — DraftPage):
```tsx
<PageHeader left={
  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
    <button className="btn-back" onClick={() => navigate(`/leagues/${leagueId}`)}>← Liga</button>
    <span className="logo">PokeFantasy</span>
  </div>
} />
```

Pages with loading-state early returns that render their own header: the early-return `<header>` is also replaced with `<PageHeader />` (no left prop needed for the skeleton state).

---

## Page inventory

| Page | Has back button | Left prop content |
|------|----------------|-------------------|
| `HomePage` | no | default (logo → `/`) |
| `LeaguesPage` | no | default |
| `LeagueDetailPage` | yes (`← Mis ligas`) | back + logo (loading state: `<PageHeader />`) |
| `PoolPage` | yes (`← Liga`) | back + logo |
| `DraftPage` | yes (`← Liga`) | back + logo |
| `TeamsPage` | yes (`← Draft`) | back + logo |
| `LeagueConfigPage` | yes (`← Liga`) | back + logo |
| `SchedulePage` | yes (`← Liga`) | back + logo |
| `TierManagementPage` | yes (`← Liga`) | back + logo |
| `ActivityPage` | yes (`← Liga`) | back + logo |
| `StandingsPage` | yes (`← Liga`) | back + logo |

---

## Non-goals

- System-preference detection (`prefers-color-scheme`) — user choice via button only
- Per-league or per-page theme settings
- Animated toggle (icon swap is sufficient)
- Backend persistence of theme preference
