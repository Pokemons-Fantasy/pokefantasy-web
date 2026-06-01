# Teams Filter Design

**Date:** 2026-06-01  
**Scope:** Frontend only — `TeamsPage.tsx`

## Problem

The TeamsPage lists every rival's full team with no way to search. Finding a specific Pokémon across all rivals (e.g. "who has Charizard?") requires scanning every grid manually. With 8 players × 20 Pokémon each, that is up to 160 cards to scan.

## Goal

Add a filter bar above the rival teams section that lets the user narrow picks by name and/or tier. The own team, bench, and all non-rival UI are unaffected.

---

## State

Two `useState` values in `TeamsPage`:

| State | Type | Default | Meaning |
|-------|------|---------|---------|
| `filterName` | `string` | `''` | Substring match against `pokemonName` (case-insensitive) |
| `filterTiers` | `Set<Tier>` | `new Set()` | Active tier filters; empty = all tiers visible |

A filter is considered **active** when `filterName.trim() !== ''` OR `filterTiers.size > 0`.

---

## Filtering logic

Applied inside `renderPicks` for rival teams only (the `!isMe` branch). Own team (`isMe === true`) skips filtering entirely.

```ts
const nameMatch = filterName.trim() === ''
  || pick.pokemonName.toLowerCase().includes(filterName.trim().toLowerCase());

const tierMatch = filterTiers.size === 0
  || filterTiers.has(tierByName.get(pick.pokemonName) as Tier);

// pick is shown only if both conditions pass
```

**Team-level hiding:** after filtering, if a rival team has 0 visible picks and the filter is active, the entire team section (header + grid) is hidden. This avoids showing "brock — 0 pokémon" ghost rows.

**Bench:** not filtered. The bench section renders independently below the teams and is not affected.

---

## UI

A compact bar placed between the own-team sticky panel and the first rival team. Two rows:

**Row 1 — text input**
```
[ 🔍 Buscar pokémon...                    ]
```
Uses existing `.search-input` class, `margin-bottom: 0`.

**Row 2 — tier pills**
```
[ S ] [ A ] [ B ] [ C ] [ D ]
```
Uses existing `.gen-tab` / `.gen-tab.active` classes (same pattern as gen-filter in PoolPage). Clicking a pill toggles that tier in/out of `filterTiers`. Multiple tiers can be active simultaneously.

**Summary line** (shown only when filter is active):
```
3 rivales · 12 pokémon
```
Small muted text (`var(--text-3)`, `0.8rem`) below the pills. Counts visible rival teams and total visible picks across those teams.

**Reset:** clearing the input and deactivating all pills returns to the unfiltered state. No explicit "Clear" button needed — the pills toggle off naturally.

---

## Component changes

| File | Change |
|------|--------|
| `src/pages/TeamsPage.tsx` | Add `filterName` + `filterTiers` state; add filter bar JSX between own-team panel and rival teams loop; apply filter inside rival rendering |

No new files. No backend changes. No new CSS classes (reuses `.search-input`, `.gen-tab`, `.gen-tab.active`).

---

## Non-goals

- Filtering own team or bench
- Sorting picks within a team
- URL-persisted filter state
- Per-team individual search
