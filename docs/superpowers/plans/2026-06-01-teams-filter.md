# TeamsPage Rival Filter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a name + tier filter bar above rival teams in TeamsPage so the user can quickly find a Pokémon across all rivals.

**Architecture:** Two `useState` values (`filterName`, `filterTiers`) drive a `filteredRivals` derived array. The filter bar renders between the own-team sticky panel and the rival teams loop. No backend changes, no new files.

**Tech Stack:** React 19, TypeScript, existing CSS classes (`.search-input`, `.gen-tab`, `.gen-tab.active`)

---

## Files

| File | Change |
|------|--------|
| `src/pages/TeamsPage.tsx` | Add filter state, derive `filteredRivals`, add filter bar UI, replace rival teams loop |

---

### Task 1: Add filter state and derived rival list

**Files:**
- Modify: `src/pages/TeamsPage.tsx`

- [ ] **Step 1: Add imports and state**

In `TeamsPage.tsx`, add `filterTiers` state right after the existing `filterName` (or after the `ownTeamCollapsed` state around line 45). The `Tier` type is already imported via `import type { BenchEntry, ClosedListEntry, DraftPick, Tier } from '../api/pokemons';`.

```tsx
const [filterName, setFilterName] = useState('');
const [filterTiers, setFilterTiers] = useState<Set<Tier>>(new Set());
```

- [ ] **Step 2: Derive filteredRivals below the `teams` computation (around line 210)**

Add after the `myTeam` line:

```tsx
const filterActive = filterName.trim() !== '' || filterTiers.size > 0;

const filteredRivals = teams
  .filter((t) => t.username !== username)
  .map((team) => ({
    username: team.username,
    picks: filterActive
      ? team.picks.filter((pick) => {
          const nameMatch =
            !filterName.trim() ||
            pick.pokemonName.toLowerCase().includes(filterName.trim().toLowerCase());
          const tierMatch =
            filterTiers.size === 0 ||
            filterTiers.has(tierByName.get(pick.pokemonName) as Tier);
          return nameMatch && tierMatch;
        })
      : team.picks,
  }))
  .filter((team) => !filterActive || team.picks.length > 0);
```

- [ ] **Step 3: TypeScript check — must pass with no errors**

```bash
cd /c/PokeFantasy/pokefantasy-web && node_modules/.bin/tsc --noEmit
```

Expected: no output (0 errors).

---

### Task 2: Add filter bar UI

**Files:**
- Modify: `src/pages/TeamsPage.tsx`

- [ ] **Step 1: Insert filter bar between own-team panel and rival teams**

Locate the comment `{teams.filter((team) => team.username !== username).map(...)` inside the main `{draft && teams.length > 0 && (...)}` block. Insert the filter bar **just before** that rival teams loop (and after the own-team panel closing tag).

```tsx
{/* ── Filter bar (rivals only) ── */}
{teams.some((t) => t.username !== username) && (
  <div style={{ marginBottom: '1rem' }}>
    <input
      className="search-input"
      type="text"
      placeholder="Buscar pokémon en equipos rivales..."
      value={filterName}
      onChange={(e) => setFilterName(e.target.value)}
      style={{ marginBottom: '0.5rem' }}
    />
    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
      <span style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginRight: '0.1rem' }}>
        Tier:
      </span>
      {(['S', 'A', 'B', 'C', 'D'] as Tier[]).map((tier) => (
        <button
          key={tier}
          className={`gen-tab${filterTiers.has(tier) ? ' active' : ''}`}
          onClick={() =>
            setFilterTiers((prev) => {
              const next = new Set(prev);
              if (next.has(tier)) next.delete(tier);
              else next.add(tier);
              return next;
            })
          }
        >
          {tier}
        </button>
      ))}
      {filterActive && (
        <button
          className="gen-tab"
          style={{ color: 'var(--red)', borderColor: 'rgba(248,113,113,0.3)' }}
          onClick={() => { setFilterName(''); setFilterTiers(new Set()); }}
        >
          ✕ Limpiar
        </button>
      )}
    </div>
    {filterActive && (
      <p style={{ fontSize: '0.8rem', color: 'var(--text-3)', marginTop: '0.45rem' }}>
        {filteredRivals.length}{' '}
        {filteredRivals.length === 1 ? 'rival' : 'rivales'} ·{' '}
        {filteredRivals.reduce((acc, t) => acc + t.picks.length, 0)} pokémon
      </p>
    )}
  </div>
)}
```

- [ ] **Step 2: Replace the rival teams loop with `filteredRivals`**

Find:
```tsx
{teams.filter((team) => team.username !== username).map((team) => (
```

Replace with:
```tsx
{filteredRivals.map((team) => (
```

The rest of the loop body stays identical — `team.username`, `team.picks`, `renderPicks(team, false)` all still work because `filteredRivals` has the same shape as the original teams array.

- [ ] **Step 3: TypeScript check**

```bash
cd /c/PokeFantasy/pokefantasy-web && node_modules/.bin/tsc --noEmit
```

Expected: no output.

- [ ] **Step 4: Build check**

```bash
cd /c/PokeFantasy/pokefantasy-web && npm run build 2>&1 | tail -8
```

Expected: `✓ built in ...ms`

---

### Task 3: Manual verification

- [ ] Start the dev server: `cd /c/PokeFantasy/pokefantasy-web && npm run dev`
- [ ] Open a league with a completed draft that has multiple players
- [ ] Type "char" in the filter — only Pokémon whose name contains "char" appear; teams with no match disappear
- [ ] Click tier pill "S" — only S-tier Pokémon appear; combined with name filter both must match
- [ ] Click "✕ Limpiar" — all rivals reappear
- [ ] Summary line "N rivales · M pokémon" appears only when filter is active
- [ ] Own team panel and bench are unaffected by the filter

---

### Task 4: Commit and push

- [ ] **Commit**

```bash
cd /c/PokeFantasy/pokefantasy-web
git add src/pages/TeamsPage.tsx
git commit -m "feat: add name + tier filter for rival teams in TeamsPage"
```

- [ ] **Push**

```bash
git push origin feature/teams-filter
```

(Create branch `feature/teams-filter` first if not already on it: `git checkout -b feature/teams-filter`)
