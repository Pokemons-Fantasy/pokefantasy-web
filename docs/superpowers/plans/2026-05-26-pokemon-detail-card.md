# Pokémon Detail Card — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mostrar un modal con sprite, tipos, stats base y tier al hacer clic en el botón ℹ️ de cualquier tarjeta Pokémon en PoolPage, DraftPage y TeamsPage.

**Architecture:** Un único componente `PokemonDetailModal` reutilizable. Los datos vienen de `ClosedListEntry` (ya disponible en las tres páginas). Se añaden dos campos opcionales (`stats`, `types`) al tipo TypeScript existente. El botón ℹ️ usa `e.stopPropagation()` para no interferir con la acción original de cada tarjeta.

**Tech Stack:** React 19, TypeScript 6, CSS custom properties (dark theme). No nuevos endpoints. No nueva query. Sin librería de animaciones.

---

## Archivos

| Acción | Archivo |
|--------|---------|
| Modificar | `src/api/pokemons.ts` |
| Crear | `src/components/PokemonDetailModal.tsx` |
| Modificar | `src/index.css` |
| Modificar | `src/pages/PoolPage.tsx` |
| Modificar | `src/pages/DraftPage.tsx` |
| Modificar | `src/pages/TeamsPage.tsx` |

---

## Task 1: Extender el tipo `ClosedListEntry`

**Files:**
- Modify: `src/api/pokemons.ts`

- [ ] **Añadir campos `stats` y `types` a `ClosedListEntry`**

  Reemplazar la interfaz actual:
  ```ts
  export interface ClosedListEntry {
    id: string;
    pokemonId: number;
    pokemonName: string;
    nominatedBy: string;
    sprite: string;
    tier?: Tier | null;
    stats?: {
      hp: number;
      attack: number;
      defense: number;
      specialAttack: number;
      specialDefense: number;
      speed: number;
    } | null;
    types?: string[];
  }
  ```

- [ ] **Verificar compilación**

  ```bash
  cd C:/PokeFantasy/pokefantasy-web && ./node_modules/.bin/tsc --noEmit
  ```
  Expected: sin errores.

- [ ] **Commit**

  ```bash
  git checkout -b feat/pokemon-detail-card
  git add src/api/pokemons.ts
  git commit -m "feat: add stats and types fields to ClosedListEntry"
  ```

---

## Task 2: Crear `PokemonDetailModal`

**Files:**
- Create: `src/components/PokemonDetailModal.tsx`

- [ ] **Crear el archivo con el siguiente contenido**

  ```tsx
  import type { Tier } from '../api/pokemons';
  import { spriteUrl } from '../utils/sprites';

  interface Stats {
    hp: number;
    attack: number;
    defense: number;
    specialAttack: number;
    specialDefense: number;
    speed: number;
  }

  interface Props {
    pokemonId: number;
    pokemonName: string;
    tier?: Tier | null;
    stats?: Stats | null;
    types?: string[];
    onClose: () => void;
  }

  const TYPE_COLORS: Record<string, { color: string; bg: string }> = {
    fire:     { color: '#fca5a5', bg: 'rgba(239,68,68,0.15)' },
    water:    { color: '#7dd3fc', bg: 'rgba(56,189,248,0.15)' },
    grass:    { color: '#86efac', bg: 'rgba(74,222,128,0.15)' },
    electric: { color: '#fde047', bg: 'rgba(234,179,8,0.15)' },
    psychic:  { color: '#f0abfc', bg: 'rgba(232,121,249,0.15)' },
    ice:      { color: '#a5f3fc', bg: 'rgba(34,211,238,0.15)' },
    dragon:   { color: '#818cf8', bg: 'rgba(99,102,241,0.15)' },
    dark:     { color: '#a1a1aa', bg: 'rgba(113,113,122,0.15)' },
    fairy:    { color: '#fbcfe8', bg: 'rgba(244,114,182,0.15)' },
    normal:   { color: '#d4d4d8', bg: 'rgba(161,161,170,0.15)' },
    fighting: { color: '#fb923c', bg: 'rgba(249,115,22,0.15)' },
    flying:   { color: '#a5b4fc', bg: 'rgba(129,140,248,0.15)' },
    poison:   { color: '#c084fc', bg: 'rgba(168,85,247,0.15)' },
    ground:   { color: '#d6b986', bg: 'rgba(180,143,74,0.15)' },
    rock:     { color: '#a8a29e', bg: 'rgba(120,113,108,0.15)' },
    bug:      { color: '#a3e635', bg: 'rgba(132,204,22,0.15)' },
    ghost:    { color: '#a78bfa', bg: 'rgba(124,58,237,0.15)' },
    steel:    { color: '#94a3b8', bg: 'rgba(100,116,139,0.15)' },
  };

  const STAT_META: { key: keyof Stats; label: string; color: string }[] = [
    { key: 'hp',             label: 'HP',  color: '#4ade80' },
    { key: 'attack',         label: 'Atk', color: '#f87171' },
    { key: 'defense',        label: 'Def', color: '#60a5fa' },
    { key: 'specialAttack',  label: 'SpA', color: '#c084fc' },
    { key: 'specialDefense', label: 'SpD', color: '#2dd4bf' },
    { key: 'speed',          label: 'Spe', color: '#fbbf24' },
  ];

  const TIER_COLORS: Record<string, string> = {
    S: '#fbbf24', A: '#f87171', B: '#60a5fa', C: '#4ade80', D: '#a1a1aa',
  };

  export default function PokemonDetailModal({ pokemonId, pokemonName, tier, stats, types, onClose }: Props) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div
          className="modal"
          style={{ maxWidth: 480, gap: '0.75rem' }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ margin: 0, fontSize: '1.15rem' }}>{pokemonName}</h2>
            <button
              onClick={onClose}
              style={{
                background: 'none', border: 'none', color: 'var(--text-3)',
                fontSize: '1.2rem', cursor: 'pointer', padding: '0 0.25rem', lineHeight: 1,
              }}
              aria-label="Cerrar"
            >
              ×
            </button>
          </div>

          {/* Body: two columns */}
          <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'flex-start' }}>

            {/* Left column: sprite + types */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
              <div style={{
                background: 'radial-gradient(circle at center, rgba(251,191,36,0.07) 0%, transparent 70%)',
                borderRadius: 12,
                width: 104,
                height: 104,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <img
                  src={spriteUrl(pokemonId)}
                  alt={pokemonName}
                  width={96}
                  height={96}
                  style={{ imageRendering: 'pixelated', filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.4))' }}
                />
              </div>
              {types && types.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', alignItems: 'center' }}>
                  {types.map((t) => {
                    const tc = TYPE_COLORS[t.toLowerCase()];
                    return (
                      <span
                        key={t}
                        style={{
                          padding: '0.2rem 0.65rem',
                          borderRadius: 999,
                          fontSize: '0.7rem',
                          fontWeight: 600,
                          color: tc?.color ?? 'var(--text-2)',
                          background: tc?.bg ?? 'var(--surface-2)',
                          border: `1px solid ${tc?.color ?? 'var(--border)'}33`,
                          textTransform: 'capitalize',
                        }}
                      >
                        {t}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Right column: tier + stats */}
            <div style={{ flex: 1, minWidth: 0 }}>
              {tier && (
                <div style={{ marginBottom: '0.75rem' }}>
                  <span style={{
                    display: 'inline-block',
                    padding: '0.2rem 0.65rem',
                    borderRadius: 6,
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: TIER_COLORS[tier] ?? 'var(--text)',
                    background: `${TIER_COLORS[tier] ?? '#fff'}18`,
                    border: `1px solid ${TIER_COLORS[tier] ?? '#fff'}40`,
                  }}>
                    Tier {tier}
                  </span>
                </div>
              )}

              {stats ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.38rem' }}>
                  {STAT_META.map(({ key, label, color }) => {
                    const val = stats[key];
                    const pct = Math.min(100, Math.round((val / 255) * 100));
                    return (
                      <div key={key} style={{ display: 'grid', gridTemplateColumns: '3rem 2.4rem 1fr', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-3)', textAlign: 'right' }}>{label}</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text)', textAlign: 'right', fontFamily: "'Space Mono', monospace" }}>{val}</span>
                        <div style={{ height: 6, background: 'rgba(255,255,255,0.07)', borderRadius: 999, overflow: 'hidden' }}>
                          <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 999 }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p style={{ fontSize: '0.82rem', color: 'var(--text-3)', margin: 0 }}>Sin datos de stats</p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }
  ```

- [ ] **Verificar compilación**

  ```bash
  cd C:/PokeFantasy/pokefantasy-web && ./node_modules/.bin/tsc --noEmit
  ```
  Expected: sin errores.

- [ ] **Commit**

  ```bash
  git add src/components/PokemonDetailModal.tsx
  git commit -m "feat: add PokemonDetailModal component"
  ```

---

## Task 3: Añadir CSS del botón ℹ️

**Files:**
- Modify: `src/index.css`

- [ ] **Añadir las siguientes reglas al final de `src/index.css`**

  ```css
  /* ── Pokemon info button ── */
  .pokemon-info-btn {
    position: absolute;
    top: 4px;
    right: 4px;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.12);
    color: var(--text-3);
    font-size: 0.65rem;
    font-style: italic;
    font-family: serif;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    opacity: 0;
    transition: opacity 0.15s;
    padding: 0;
    line-height: 1;
    z-index: 1;
  }
  .pokemon-card:hover .pokemon-info-btn {
    opacity: 1;
  }
  @media (hover: none) {
    .pokemon-info-btn {
      opacity: 1;
    }
  }
  ```

- [ ] **Commit**

  ```bash
  git add src/index.css
  git commit -m "feat: add pokemon-info-btn CSS"
  ```

---

## Task 4: Integrar en `PoolPage`

**Files:**
- Modify: `src/pages/PoolPage.tsx`

- [ ] **Añadir import de `ClosedListEntry` y `PokemonDetailModal`**

  Localizar el bloque de imports. Añadir:
  ```ts
  import type { AvailablePokemon, ClosedListEntry } from '../api/pokemons';
  import PokemonDetailModal from '../components/PokemonDetailModal';
  ```
  (Reemplaza el `import type { AvailablePokemon } from '../api/pokemons'` existente.)

- [ ] **Añadir estado `detailEntry`**

  Dentro de `export default function PoolPage()`, junto al resto de `useState`, añadir:
  ```ts
  const [detailEntry, setDetailEntry] = useState<ClosedListEntry | null>(null);
  ```

- [ ] **Construir `entryByName` a partir de `closedList`**

  Justo después de la línea `const tierByName = new Map(...)` existente, añadir:
  ```ts
  const entryByName = new Map(closedList.map((e) => [e.pokemonName, e]));
  ```

- [ ] **Añadir botón ℹ️ dentro de cada tarjeta del pool**

  Localizar el bloque `<div className={`pokemon-card ...`}` en el `filtered.map(...)`. Añadir el botón **solo cuando `isNominated` es true**, justo antes del cierre `</div>` de la tarjeta:

  ```tsx
  {isNominated && (
    <button
      className="pokemon-info-btn"
      onClick={(e) => { e.stopPropagation(); setDetailEntry(entryByName.get(pokemon.name) ?? null); }}
      title="Ver detalles"
    >
      i
    </button>
  )}
  ```

- [ ] **Añadir el modal al final del JSX, antes del cierre `</div>` del `page-wrapper`**

  ```tsx
  {detailEntry && (
    <PokemonDetailModal
      pokemonId={detailEntry.pokemonId}
      pokemonName={detailEntry.pokemonName}
      tier={detailEntry.tier}
      stats={detailEntry.stats}
      types={detailEntry.types}
      onClose={() => setDetailEntry(null)}
    />
  )}
  ```

- [ ] **Verificar compilación**

  ```bash
  cd C:/PokeFantasy/pokefantasy-web && ./node_modules/.bin/tsc --noEmit
  ```
  Expected: sin errores.

- [ ] **Commit**

  ```bash
  git add src/pages/PoolPage.tsx
  git commit -m "feat: add pokemon detail modal to PoolPage"
  ```

---

## Task 5: Integrar en `DraftPage`

**Files:**
- Modify: `src/pages/DraftPage.tsx`

- [ ] **Añadir import de `ClosedListEntry` y `PokemonDetailModal`**

  Localizar la línea `import { getDraftStatus, draftPick, getClosedList, cancelDraft } from '../api/pokemons';`. Extenderla:
  ```ts
  import { getDraftStatus, draftPick, getClosedList, cancelDraft } from '../api/pokemons';
  import type { ClosedListEntry } from '../api/pokemons';
  import PokemonDetailModal from '../components/PokemonDetailModal';
  ```

- [ ] **Añadir estado `detailEntry`**

  Junto al resto de `useState` en la función:
  ```ts
  const [detailEntry, setDetailEntry] = useState<ClosedListEntry | null>(null);
  ```

- [ ] **Añadir botón ℹ️ en cada tarjeta del pool de draft**

  Localizar el `filtered.map((entry) => (` dentro del bloque `isMyTurn`. Añadir el botón antes del cierre `</div>` de la tarjeta:

  ```tsx
  <button
    className="pokemon-info-btn"
    onClick={(e) => { e.stopPropagation(); setDetailEntry(entry); }}
    title="Ver detalles"
  >
    i
  </button>
  ```

- [ ] **Añadir el modal al final del JSX, antes del cierre `</div>` del `page-wrapper`**

  ```tsx
  {detailEntry && (
    <PokemonDetailModal
      pokemonId={detailEntry.pokemonId}
      pokemonName={detailEntry.pokemonName}
      tier={detailEntry.tier}
      stats={detailEntry.stats}
      types={detailEntry.types}
      onClose={() => setDetailEntry(null)}
    />
  )}
  ```

- [ ] **Verificar compilación**

  ```bash
  cd C:/PokeFantasy/pokefantasy-web && ./node_modules/.bin/tsc --noEmit
  ```
  Expected: sin errores.

- [ ] **Commit**

  ```bash
  git add src/pages/DraftPage.tsx
  git commit -m "feat: add pokemon detail modal to DraftPage"
  ```

---

## Task 6: Integrar en `TeamsPage`

**Files:**
- Modify: `src/pages/TeamsPage.tsx`

- [ ] **Añadir import de `ClosedListEntry` y `PokemonDetailModal`**

  Localizar la línea `import type { BenchEntry, DraftPick, Tier } from '../api/pokemons';`. Extenderla:
  ```ts
  import type { BenchEntry, ClosedListEntry, DraftPick, Tier } from '../api/pokemons';
  import PokemonDetailModal from '../components/PokemonDetailModal';
  ```

- [ ] **Añadir estado `detailEntry`**

  Junto al resto de `useState` en la función:
  ```ts
  const [detailEntry, setDetailEntry] = useState<ClosedListEntry | null>(null);
  ```

- [ ] **Construir `entryByName`**

  Justo después de la línea `const tierByName = new Map(closedList.map((e) => [e.pokemonName, e.tier]));`, añadir:
  ```ts
  const entryByName = new Map(closedList.map((e) => [e.pokemonName, e]));
  ```

- [ ] **Añadir botón ℹ️ en picks propios**

  En `renderPicks`, dentro del bloque `if (isMe)`, añadir el botón antes del cierre `</div>` de la tarjeta propia:
  ```tsx
  <button
    className="pokemon-info-btn"
    onClick={(e) => { e.stopPropagation(); setDetailEntry(entryByName.get(pick.pokemonName) ?? null); }}
    title="Ver detalles"
  >
    i
  </button>
  ```

- [ ] **Añadir botón ℹ️ en picks rivales**

  En `renderPicks`, dentro del bloque `else` (picks rivales), añadir el botón antes del cierre `</div>` de la tarjeta rival:
  ```tsx
  <button
    className="pokemon-info-btn"
    onClick={(e) => { e.stopPropagation(); setDetailEntry(entryByName.get(pick.pokemonName) ?? null); }}
    title="Ver detalles"
  >
    i
  </button>
  ```

- [ ] **Añadir botón ℹ️ en la banca**

  En el bloque `bench.map((entry) => {`, dentro del `<div className="pokemon-card" ...>` de banca, añadir el botón antes del cierre `</div>`:
  ```tsx
  <button
    className="pokemon-info-btn"
    onClick={(e) => { e.stopPropagation(); setDetailEntry(entryByName.get(entry.pokemonName) ?? null); }}
    title="Ver detalles"
  >
    i
  </button>
  ```

- [ ] **Añadir el modal al final del JSX, antes del cierre `</div>` del `page-wrapper`**

  ```tsx
  {detailEntry && (
    <PokemonDetailModal
      pokemonId={detailEntry.pokemonId}
      pokemonName={detailEntry.pokemonName}
      tier={detailEntry.tier}
      stats={detailEntry.stats}
      types={detailEntry.types}
      onClose={() => setDetailEntry(null)}
    />
  )}
  ```

- [ ] **Verificar compilación**

  ```bash
  cd C:/PokeFantasy/pokefantasy-web && ./node_modules/.bin/tsc --noEmit
  ```
  Expected: sin errores.

- [ ] **Commit**

  ```bash
  git add src/pages/TeamsPage.tsx
  git commit -m "feat: add pokemon detail modal to TeamsPage"
  ```

---

## Task 7: Build final y PR

- [ ] **Build de producción**

  ```bash
  cd C:/PokeFantasy/pokefantasy-web && npm run build
  ```
  Expected: `✓ built in Xs` sin errores TypeScript ni de Vite.

- [ ] **Push y PR**

  ```bash
  git push origin feat/pokemon-detail-card
  ```

  Crear PR via GitHub API (PowerShell):
  ```powershell
  $h = @{ Authorization = "Bearer $env:GITHUB_TOKEN"; Accept = "application/vnd.github+json" }
  $body = @{
    title = "feat: pokemon detail card modal"
    head  = "feat/pokemon-detail-card"
    base  = "main"
    body  = "Modal de detalle para tarjetas Pokémon. Muestra sprite, tipos con pastillas de color, stats base con barras y tier. Botón ℹ️ en hover sobre cada tarjeta en PoolPage (solo nominados), DraftPage y TeamsPage (picks + banca).`n`n🤖 Generated with [Claude Code](https://claude.com/claude-code)"
  } | ConvertTo-Json
  Invoke-RestMethod -Uri "https://api.github.com/repos/Pokemons-Fantasy/pokefantasy-web/pulls" -Method Post -Headers $h -Body $body -ContentType "application/json; charset=utf-8"
  ```
