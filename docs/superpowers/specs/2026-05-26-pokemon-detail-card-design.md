# Pokémon Detail Card — Design Spec

**Date:** 2026-05-26
**Scope:** Frontend only. No new backend endpoints required.

---

## Context

Las tarjetas de Pokémon en PoolPage, DraftPage y TeamsPage muestran sprite, nombre y tier, pero no exponen los stats base ni los tipos. El backend ya devuelve `stats` y `types` en `ClosedListEntry` (colección `closed_list`); el tipo TypeScript simplemente no los declara todavía. El objetivo es mostrar esa información en un modal al hacer clic en un botón ℹ️ sobre la tarjeta, sin interferir con las acciones existentes (nominar, draftear, robar, etc.).

---

## Decisiones de diseño

| Pregunta | Decisión |
|----------|----------|
| Layout del modal | Dos columnas: sprite + tipos (izquierda), nombre + tier + stats (derecha) |
| Trigger | Botón ℹ️ 18px en esquina superior derecha de cada `.pokemon-card` |
| Datos | `ClosedListEntry.stats` y `.types` — extender el tipo TS existente |
| Nuevo endpoint | No — reutilizar la query `getClosedList` ya presente |

---

## Cambios por archivo

### 1. `src/api/pokemons.ts`

Añadir campos opcionales a `ClosedListEntry`:

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

Los campos son opcionales (`?`) para mantener compatibilidad con respuestas antiguas o entradas sin datos.

### 2. `src/components/PokemonDetailModal.tsx` (nuevo)

**Props:**
```ts
interface Props {
  pokemonId: number;
  pokemonName: string;
  tier?: Tier | null;
  stats?: ClosedListEntry['stats'];
  types?: string[];
  onClose: () => void;
}
```

**Layout:**
- Overlay `.modal-overlay` (patrón existente, `z-index: 100`, backdrop blur).
- Modal `.modal` con `max-width: 480px`.
- Cabecera: nombre bold + botón X para cerrar.
- Cuerpo en dos columnas (`display: flex; gap: 1.25rem`):
  - **Izquierda** (ancho fijo ~120px): sprite 96px × 96px (`spriteUrl(pokemonId)`, `imageRendering: pixelated`) + type pills debajo (una por tipo).
  - **Derecha** (flex: 1): tier badge + 6 filas de stats.
- Cierra también al hacer clic en el overlay.

**Filas de stats:**
Cada fila: `grid-template-columns: 3rem 2.5rem 1fr`. Label (`HP`, `Atk`, `Def`, `SpA`, `SpD`, `Spe`) → valor numérico → barra de progreso (max 255). Colores por stat:
- HP → `#4ade80`, Atk → `#f87171`, Def → `#60a5fa`, SpA → `#c084fc`, SpD → `#2dd4bf`, Spe → `#fbbf24`

**Tipos — mapa de colores** (texto/fondo semitransparente, mismo patrón que la pastilla `tier`):

| Tipo | Color texto | Fondo |
|------|------------|-------|
| fire | `#fca5a5` | `rgba(239,68,68,0.15)` |
| water | `#7dd3fc` | `rgba(56,189,248,0.15)` |
| grass | `#86efac` | `rgba(74,222,128,0.15)` |
| electric | `#fde047` | `rgba(234,179,8,0.15)` |
| psychic | `#f0abfc` | `rgba(232,121,249,0.15)` |
| ice | `#a5f3fc` | `rgba(34,211,238,0.15)` |
| dragon | `#818cf8` | `rgba(99,102,241,0.15)` |
| dark | `#a1a1aa` | `rgba(113,113,122,0.15)` |
| fairy | `#fbcfe8` | `rgba(244,114,182,0.15)` |
| normal | `#d4d4d8` | `rgba(161,161,170,0.15)` |
| fighting | `#fb923c` | `rgba(249,115,22,0.15)` |
| flying | `#a5b4fc` | `rgba(129,140,248,0.15)` |
| poison | `#c084fc` | `rgba(168,85,247,0.15)` |
| ground | `#d6b986` | `rgba(180,143,74,0.15)` |
| rock | `#a8a29e` | `rgba(120,113,108,0.15)` |
| bug | `#a3e635` | `rgba(132,204,22,0.15)` |
| ghost | `#a78bfa` | `rgba(124,58,237,0.15)` |
| steel | `#94a3b8` | `rgba(100,116,139,0.15)` |

Si `stats` es `null`/`undefined`, mostrar texto "Sin datos de stats" en lugar de las barras. Si `types` está vacío, omitir la sección de tipos.

### 3. Botón ℹ️ en `.pokemon-card`

En cada página, dentro del JSX de la tarjeta añadir:

```tsx
<button
  className="pokemon-info-btn"
  onClick={(e) => { e.stopPropagation(); setDetailEntry(entry); }}
  title="Ver detalles"
>
  i
</button>
```

CSS en `index.css` (una sola regla global):
```css
.pokemon-info-btn {
  position: absolute;
  top: 4px; right: 4px;
  width: 18px; height: 18px;
  border-radius: 50%;
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.12);
  color: var(--text-3);
  font-size: 0.65rem;
  font-style: italic;
  font-family: serif;
  font-weight: 700;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.15s;
  padding: 0;
  line-height: 1;
}
.pokemon-card:hover .pokemon-info-btn { opacity: 1; }
/* Siempre visible en touch (no hover en móvil) */
@media (hover: none) {
  .pokemon-info-btn { opacity: 1; }
}
```

### 4. `src/pages/PoolPage.tsx`

PoolPage renderiza `AvailablePokemon[]` (toda la pokédex), pero `stats`/`types` solo existen para Pokémon nominados (los que tienen `ClosedListEntry`). Por tanto:

- Construir `entryByName = new Map(closedList.map(e => [e.pokemonName, e]))` (PoolPage ya tiene `closedList` disponible).
- Estado: `const [detailEntry, setDetailEntry] = useState<ClosedListEntry | null>(null)`
- Mostrar el botón ℹ️ **solo** si `entryByName.has(pokemon.name)` (es decir, solo en tarjetas nominadas).
- `onClick={(e) => { e.stopPropagation(); setDetailEntry(entryByName.get(pokemon.name)!); }}`
- Al final del JSX: `{detailEntry && <PokemonDetailModal ... onClose={() => setDetailEntry(null)} />}`

### 5. `src/pages/DraftPage.tsx`

- Estado: `const [detailEntry, setDetailEntry] = useState<ClosedListEntry | null>(null)`
- En el render de `entry` (ya es `ClosedListEntry`): añadir botón ℹ️.
- Modal al final del JSX.

### 6. `src/pages/TeamsPage.tsx`

- Construir `entryByName` a partir de la query `closedList` existente:
  ```ts
  const entryByName = new Map(closedList.map((e) => [e.pokemonName, e]));
  ```
- Estado: `const [detailEntry, setDetailEntry] = useState<ClosedListEntry | null>(null)`
- Añadir botón ℹ️ en tres lugares:
  - Picks propios
  - Picks rivales
  - Banca (bench cards)
  - En los tres: `onClick={(e) => { e.stopPropagation(); setDetailEntry(entryByName.get(pick.pokemonName) ?? null); }}`
- Modal al final del JSX.

---

## Verificación

1. `npm run build` — sin errores TypeScript.
2. En PoolPage: hover sobre tarjeta → aparece ℹ️ → click → modal con sprite, tipos, stats, tier.
3. En DraftPage: igual.
4. En TeamsPage: picks propios, picks rivales y banca muestran el modal. Click en el resto de la tarjeta sigue haciendo la acción original (no abre modal).
5. Si un Pokémon no tiene stats en la respuesta, el modal muestra "Sin datos de stats" sin romper.
6. El modal cierra al hacer clic en el overlay.
