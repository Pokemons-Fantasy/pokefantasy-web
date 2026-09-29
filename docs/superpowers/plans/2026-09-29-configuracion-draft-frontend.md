# Configuración del draft (frontend) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pantalla de preparación del draft para el admin (tiers, precios, presupuesto, orden de turnos, snake), vista de solo lectura para los jugadores durante la preparación, y draft con precios, presupuesto restante y tablero con gasto por jugador.

**Architecture:** Todo sale de `GET draft` (`config`, `budgets`, `price` de cada pick) y `GET closed-list` (tiers). La preparación es una página nueva (`DraftSetupPage`, ruta `draft/setup` dentro de `LeagueLayout`) con el patrón de `LeagueConfigPage` para el formulario (guardar explícito + `useBlocker`); mover tiers se guarda al momento. La lógica pura va en `utils/draftBudget.ts` y `utils/draftSetup.ts` con tests. La fase `PENDING` pasa a ser su propia fase de liga (`preparing`).

**Tech Stack:** React 19, TypeScript, Vite, React Query, React Router (data router), Vitest + Testing Library, Zustand.

**Spec:** `C:\PokeFantasy\vault\50 Features\Configuración del draft.md`. Plan del backend (contrato de la API): `C:\PokeFantasy\wt\back-draft-config\docs\superpowers\plans\2026-09-29-configuracion-draft-backend.md`, Task 10.

## Global Constraints

- Worktree `C:\PokeFantasy\wt\front-draft-config` (rama `feature/configuracion-draft`, base `origin/main`). PR contra `main`, **mergear después del PR del backend** (los endpoints de preparación no existen en el back desplegado).
- Toda llamada HTTP en `src/api/*.ts`; tipos escritos a mano + entrada en `contract.ts`; `schema.d.ts`/`openapi.json` regenerados, nunca editados a mano.
- Campos nuevos de la API opcionales en los tipos (`config?`, `budgets?`, `price?`): con un draft anterior no vienen.
- El front no decide si un pick está permitido de forma distinta al backend: usa `budgets` y `config` para mostrar y deshabilitar; el backend valida.
- Accesibilidad: controles con `<button>`, `aria-pressed`/`aria-disabled`, `aria-label` descriptivo; `prefers-reduced-motion` respetado en lo que se anime.
- Textos en español, sin em-dash. Monedas con `coinsLabel` (`utils/coins.ts`).
- Antes del push: `npm run lint`, `npm run api:check`, `npm test`, `npm run build`.
- Commits con `git commit -F <archivo>` (UTF-8 sin BOM), terminando en `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **Un miembro entra en la liga durante la preparación**: el orden de turnos del formulario lo añade al final (`syncTurnOrder`) y la página marca cambios sin guardar, así que "Empezar" pide guardar antes. Test en Task 7 (`orden con un miembro nuevo cuenta como cambio sin guardar`).
2. **Jugador sin presupuesto durante el draft**: ve "Tu draft ha terminado" en vez del banner de turno, y no hay cards clicables. Test en Task 8.
3. **Precio igual al saldo**: la card no sale atenuada (`<=`). Test en Task 2 (`canAfford`) y Task 8.
4. **Draft anterior sin config**: `DraftPage` no muestra precios ni presupuesto y el tablero no pinta resumen de gasto. Test existente de `DraftPage` sigue en verde (Task 8).
5. **Admin sale de la preparación con cambios sin guardar**: `useBlocker` pide confirmación. Test en Task 7.

---

## File Structure

| Archivo | Responsabilidad |
|---|---|
| `src/api/pokemons.ts` | Tipos `DraftConfig`, `DraftConfigPayload`; campos nuevos; `prepareDraft`, `updateDraftConfig`, `setDraftPoolTiers`, `resetDraftPoolTiers`, `startPreparedDraft` (sustituye a `startDraft`) |
| `src/api/activity.ts`, `utils/activity.ts`, `components/activity/ActivityRow.tsx`, `pages/PlayerProfilePage.tsx` | Evento `DRAFT_COINS` |
| `src/api/contract.ts`, `openapi.json`, `src/api/schema.d.ts` | Contrato regenerado |
| `src/utils/draftBudget.ts` (nuevo) | Precio por tier, restante, asequible, aviso de cobertura, gasto por jugador |
| `src/utils/draftSetup.ts` (nuevo) | Formulario de preparación: igualdad y validación |
| `src/utils/draftBoard.ts` | Numeración snake |
| `src/utils/leaguePhase.ts`, `utils/leagueNav.ts`, `utils/home.ts` | Fase `preparing` |
| `src/pages/PoolPage.tsx` | Nominaciones cerradas con cualquier draft |
| `src/components/draft/TurnOrderEditor.tsx` (nuevo) | Lista de orden de turnos con flechas y Barajar (extraída de Miembros) |
| `src/components/draft/DraftBoard.tsx` | Presupuesto en cabecera, precio en casilla, fila de resumen |
| `src/components/draftSetup/DraftBudgetForm.tsx`, `SetupTierBoard.tsx` (nuevos) | Piezas de la preparación |
| `src/pages/DraftSetupPage.tsx` (nuevo) + ruta en `App.tsx` | Pantalla de preparación del admin |
| `src/pages/LeagueMembersPage.tsx` | Botón "Preparar draft" |
| `src/pages/DraftPage.tsx` | Vista en preparación, precios, presupuesto, fin del draft para el jugador |

---

### Task 1: Capa de API, contrato y evento `DRAFT_COINS`

**Files:**
- Modify: `src/api/pokemons.ts`, `src/api/activity.ts`, `src/api/contract.ts`, `openapi.json`, `src/api/schema.d.ts`
- Modify: `src/utils/activity.ts`, `src/components/activity/ActivityRow.tsx`, `src/pages/PlayerProfilePage.tsx`
- Test: `src/utils/activity.test.ts`

**Interfaces:**
- Produces (en `src/api/pokemons.ts`):

```ts
export interface DraftConfig {
  budget: number;
  priceS: number;
  priceA: number;
  priceB: number;
  priceC: number;
  priceD: number;
  snake: boolean;
}

/** Cuerpo de PUT draft/config. */
export interface DraftConfigPayload extends DraftConfig {
  turnOrder: string[];
}
```

  - `DraftPick.price?: number | null`; `DraftStatus.config?: DraftConfig | null`; `DraftStatus.budgets?: Record<string, number> | null`.
  - `prepareDraft(leagueId: string): Promise<void>`, `updateDraftConfig(leagueId: string, payload: DraftConfigPayload): Promise<void>`, `setDraftPoolTiers(leagueId: string, entryIds: string[], tier: Tier): Promise<void>`, `resetDraftPoolTiers(leagueId: string): Promise<void>`, `startPreparedDraft(leagueId: string): Promise<void>`.
  - `ActivityEvent['type']` incluye `'DRAFT_COINS'`.

- [ ] **Step 1: Regenerar la spec**

Con el backend de la rama `feature/configuracion-draft` compilado (`C:\PokeFantasy\wt\back-draft-config`, `./mvnw -B -ntp -f src/pom.xml clean package -DskipTests`) arrancado solo para la spec:

```bash
SPRING_MAIN_LAZY_INITIALIZATION=true SERVER_PORT=8089 JWT_SECRET=<base64 256 bits> java -jar src/boot/target/boot-*.jar
```

En el front: `npm run api:spec -- http://localhost:8089/v3/api-docs`, dejar `servers[0].url` de `openapi.json` en `http://localhost:8080`, y `npm run api:types`.

- [ ] **Step 2: Test del evento nuevo**

Añadir en `src/utils/activity.test.ts`:

```ts
  it('DRAFT_COINS cuenta lo que sobró del draft y va con las monedas', () => {
    const e = { id: '1', type: 'DRAFT_COINS', actorUsername: 'ash', coinsAmount: 120, createdAt: '2026-09-29T10:00:00Z' } as const;
    expect(partsText(describeEvent(e))).toBe('ash recibió 120 monedas que le sobraron del draft');
    expect(eventCategory('DRAFT_COINS')).toBe('coins');
  });
```

(Importar `partsText` si el fichero no lo importa ya.)

- [ ] **Step 3: Ejecutar y ver que falla** — `npx vitest run src/utils/activity.test.ts` → error de tipo / texto "Evento desconocido".

- [ ] **Step 4: Implementar**

`src/api/pokemons.ts`: añadir los tipos de Interfaces; en `DraftPick` añadir

```ts
  /** Monedas pagadas en el draft. Ausente en drafts sin presupuesto. */
  price?: number | null;
```

en `DraftStatus`:

```ts
  /** Presupuesto, precios por tier y snake. Ausente en drafts anteriores a la configuración. */
  config?: DraftConfig | null;
  /** Monedas que le quedan a cada jugador. Ausente si el draft no tiene presupuesto. */
  budgets?: Record<string, number> | null;
```

y sustituir `startDraft` por:

```ts
export const prepareDraft = async (leagueId: string): Promise<void> => {
  await apiClient.post(`/v1/leagues/${leagueId}/draft/prepare`);
};

export const updateDraftConfig = async (leagueId: string, payload: DraftConfigPayload): Promise<void> => {
  await apiClient.put(`/v1/leagues/${leagueId}/draft/config`, payload);
};

export const setDraftPoolTiers = async (leagueId: string, entryIds: string[], tier: Tier): Promise<void> => {
  await apiClient.put(`/v1/leagues/${leagueId}/draft/pool/tiers`, { entryIds, tier });
};

export const resetDraftPoolTiers = async (leagueId: string): Promise<void> => {
  await apiClient.post(`/v1/leagues/${leagueId}/draft/pool/reset-tiers`);
};

/** Empieza el draft preparado (sin body: el orden y la config ya están guardados). */
export const startPreparedDraft = async (leagueId: string): Promise<void> => {
  await apiClient.post(`/v1/leagues/${leagueId}/draft/start`);
};
```

`startDraft` se borra en Task 6, cuando `LeagueMembersPage` deje de usarlo; hasta entonces se deja.

`src/api/contract.ts`: importar `DraftConfig, DraftConfigPayload` y añadir

```ts
  Assert<FieldsMatch<DraftConfig, S['DraftConfig']>>,
  Assert<FieldsMatch<DraftConfigPayload, S['UpdateDraftConfigRequest']>>,
```

`src/api/activity.ts`: añadir `| 'DRAFT_COINS'` a la unión.

`src/utils/activity.ts`: `DRAFT_COINS: 'coins'` en `CATEGORY` y en `describeEvent`:

```ts
    case 'DRAFT_COINS':
      return [user(e.actorUsername), txt(` recibió ${coinsLabel(coins)} que le sobraron del draft`)];
```

`src/components/activity/ActivityRow.tsx`: `DRAFT_COINS: '●'` en `ICON`.

`src/pages/PlayerProfilePage.tsx`: en `coinDelta` `case 'DRAFT_COINS': return a;`, en `coinEventIcon` `case 'DRAFT_COINS': return '🎒';`, en `coinEventLabel` `case 'DRAFT_COINS': return \`+${a} sobrantes del draft\`;`.

- [ ] **Step 5: Verificar** — `npx vitest run src/utils/activity.test.ts` PASS, `./node_modules/.bin/tsc --noEmit` sin errores, `npm run api:check` OK.

- [ ] **Step 6: Commit** — `feat(draft): API de la preparación del draft y evento DRAFT_COINS` (incluye `openapi.json` y `schema.d.ts`).

---

### Task 2: Utilidades de presupuesto y del formulario de preparación

**Files:**
- Create: `src/utils/draftBudget.ts`, `src/utils/draftBudget.test.ts`, `src/utils/draftSetup.ts`, `src/utils/draftSetup.test.ts`

**Interfaces:**
- Consumes: `DraftConfig`, `DraftPick`, `DraftStatus`, `Tier` (Task 1); `TIER_ORDER` (`utils/tiers.ts`); `coinsLabel` (`utils/coins.ts`).
- Produces:
  - `draftPrice(config: DraftConfig | null | undefined, tier: Tier | null | undefined): number`
  - `remainingBudget(draft: DraftStatus | null | undefined, username: string | null): number | null`
  - `canAfford(price: number, remaining: number | null): boolean` (sin presupuesto, siempre true)
  - `coverageHint(config: DraftConfig, rounds: number, tiersInPool: Tier[]): CoverageHint | null`, `interface CoverageHint { tone: 'info' | 'warning'; text: string }`
  - `spendingByPlayer(history: DraftPick[], tierByName: Map<string, Tier | null | undefined>): Map<string, SpendingSummary>`, `interface SpendingSummary { counts: Record<Tier, number>; spent: number }`
  - `type SetupForm = DraftConfigPayload`; `sameSetup(a: SetupForm, b: SetupForm): boolean`; `setupError(form: SetupForm): string | null`

- [ ] **Step 1: Tests**

`src/utils/draftBudget.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { canAfford, coverageHint, draftPrice, remainingBudget, spendingByPlayer } from './draftBudget';
import type { DraftConfig, DraftPick, DraftStatus } from '../api/pokemons';

const CONFIG: DraftConfig = { budget: 300, priceS: 200, priceA: 150, priceB: 100, priceC: 60, priceD: 30, snake: false };

const pick = (username: string, pokemonName: string, price?: number): DraftPick => ({
  username, pokemonName, pokemonId: 1, round: 1, pickedAt: '2026-09-29T10:00:00Z', price,
});

describe('draftPrice', () => {
  it('precio del tier, 0 sin config o sin tier', () => {
    expect(draftPrice(CONFIG, 'S')).toBe(200);
    expect(draftPrice(CONFIG, 'D')).toBe(30);
    expect(draftPrice(CONFIG, null)).toBe(0);
    expect(draftPrice(undefined, 'S')).toBe(0);
  });
});

describe('remainingBudget', () => {
  const draft: DraftStatus = {
    id: 'd1', status: 'IN_PROGRESS', turnOrder: ['ash'], currentTurn: 'ash', currentRound: 1, picks: [],
    config: CONFIG, budgets: { ash: 120 },
  };
  it('lee budgets del jugador', () => {
    expect(remainingBudget(draft, 'ash')).toBe(120);
  });
  it('null sin presupuesto, sin usuario o si el jugador no está', () => {
    expect(remainingBudget({ ...draft, config: null, budgets: null }, 'ash')).toBeNull();
    expect(remainingBudget(draft, null)).toBeNull();
    expect(remainingBudget(draft, 'misty')).toBeNull();
  });
});

describe('canAfford', () => {
  it('precio igual al saldo se puede pagar; sin presupuesto siempre', () => {
    expect(canAfford(100, 100)).toBe(true);
    expect(canAfford(101, 100)).toBe(false);
    expect(canAfford(500, null)).toBe(true);
  });
});

describe('coverageHint', () => {
  it('informa cuando llega para todas las rondas', () => {
    expect(coverageHint(CONFIG, 10, ['S', 'D'])).toEqual({
      tone: 'info',
      text: 'Con 300 monedas llega para 10 Pokémon del tier más barato (D, 30); hay 10 rondas.',
    });
  });
  it('avisa cuando no llega', () => {
    expect(coverageHint(CONFIG, 12, ['S', 'D'])).toEqual({
      tone: 'warning',
      text: 'Con 300 monedas llega para 10 Pokémon del tier más barato (D, 30) y hay 12 rondas: nadie podrá completar el equipo.',
    });
  });
  it('solo cuenta los tiers que tienen Pokémon; tier gratis o pool vacío', () => {
    expect(coverageHint(CONFIG, 10, ['S'])?.tone).toBe('warning'); // 300 / 200 = 1
    expect(coverageHint({ ...CONFIG, priceD: 0 }, 10, ['D'])).toEqual({
      tone: 'info', text: 'El tier D es gratis: todos podrán completar el equipo.',
    });
    expect(coverageHint(CONFIG, 10, [])).toBeNull();
  });
});

describe('spendingByPlayer', () => {
  it('cuenta tiers y suma lo pagado por jugador', () => {
    const tiers = new Map([['mew', 'S' as const], ['abra', 'D' as const], ['onix', 'D' as const]]);
    const result = spendingByPlayer([pick('ash', 'mew', 200), pick('ash', 'abra', 30), pick('brock', 'onix')], tiers);
    expect(result.get('ash')).toEqual({ counts: { S: 1, A: 0, B: 0, C: 0, D: 1 }, spent: 230 });
    expect(result.get('brock')).toEqual({ counts: { S: 0, A: 0, B: 0, C: 0, D: 1 }, spent: 0 });
  });
});
```

`src/utils/draftSetup.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { sameSetup, setupError, type SetupForm } from './draftSetup';

const FORM: SetupForm = {
  budget: 1000, priceS: 200, priceA: 150, priceB: 100, priceC: 60, priceD: 30, snake: false, turnOrder: ['ash', 'misty'],
};

describe('sameSetup', () => {
  it('compara números, snake y orden', () => {
    expect(sameSetup(FORM, { ...FORM, turnOrder: ['ash', 'misty'] })).toBe(true);
    expect(sameSetup(FORM, { ...FORM, priceD: 0 })).toBe(false);
    expect(sameSetup(FORM, { ...FORM, snake: true })).toBe(false);
    expect(sameSetup(FORM, { ...FORM, turnOrder: ['misty', 'ash'] })).toBe(false);
    expect(sameSetup(FORM, { ...FORM, turnOrder: ['ash', 'misty', 'brock'] })).toBe(false);
  });
});

describe('setupError', () => {
  it('presupuesto positivo y precios enteros no negativos', () => {
    expect(setupError(FORM)).toBeNull();
    expect(setupError({ ...FORM, budget: 0 })).toBe('El presupuesto tiene que ser mayor que 0');
    expect(setupError({ ...FORM, priceA: -1 })).toBe('Los precios no pueden ser negativos');
    expect(setupError({ ...FORM, priceB: 1.5 })).toBe('Los precios tienen que ser números enteros');
  });
});
```

- [ ] **Step 2: Ejecutar y ver que falla** — `npx vitest run src/utils/draftBudget.test.ts src/utils/draftSetup.test.ts`.

- [ ] **Step 3: Implementar**

`src/utils/draftBudget.ts`:

```ts
import type { DraftConfig, DraftPick, DraftStatus, Tier } from '../api/pokemons';
import { TIER_ORDER } from './tiers';

type PriceKey = 'priceS' | 'priceA' | 'priceB' | 'priceC' | 'priceD';
const PRICE_KEY: Record<Tier, PriceKey> = { S: 'priceS', A: 'priceA', B: 'priceB', C: 'priceC', D: 'priceD' };

/** Precio de un tier en el draft; 0 si el draft no tiene presupuesto o el Pokémon no tiene tier. */
export function draftPrice(config: DraftConfig | null | undefined, tier: Tier | null | undefined): number {
  if (!config || !tier) return 0;
  return config[PRICE_KEY[tier]];
}

/** Monedas que le quedan a `username` según el backend; null si el draft no tiene presupuesto. */
export function remainingBudget(draft: DraftStatus | null | undefined, username: string | null): number | null {
  if (!draft?.config || !draft.budgets || !username) return null;
  return draft.budgets[username] ?? null;
}

/** Misma regla que el backend: se puede pagar si el precio no supera lo que queda. */
export function canAfford(price: number, remaining: number | null): boolean {
  return remaining === null || price <= remaining;
}

export interface CoverageHint {
  tone: 'info' | 'warning';
  text: string;
}

/** Aviso orientativo de la preparación: cuántos Pokémon del tier más barato cubre el presupuesto frente a las rondas. */
export function coverageHint(config: DraftConfig, rounds: number, tiersInPool: Tier[]): CoverageHint | null {
  const present = TIER_ORDER.filter((t) => tiersInPool.includes(t));
  if (present.length === 0) return null;
  const cheapestTier = present.reduce((best, t) => (draftPrice(config, t) < draftPrice(config, best) ? t : best));
  const cheapest = draftPrice(config, cheapestTier);
  if (cheapest === 0) {
    return { tone: 'info', text: `El tier ${cheapestTier} es gratis: todos podrán completar el equipo.` };
  }
  const picks = Math.floor(config.budget / cheapest);
  const base = `Con ${config.budget} monedas llega para ${picks} Pokémon del tier más barato (${cheapestTier}, ${cheapest})`;
  return picks >= rounds
    ? { tone: 'info', text: `${base}; hay ${rounds} rondas.` }
    : { tone: 'warning', text: `${base} y hay ${rounds} rondas: nadie podrá completar el equipo.` };
}

export interface SpendingSummary {
  counts: Record<Tier, number>;
  spent: number;
}

/** Reparto por tier y monedas gastadas de cada jugador, a partir de draftHistory. */
export function spendingByPlayer(
  history: DraftPick[], tierByName: Map<string, Tier | null | undefined>,
): Map<string, SpendingSummary> {
  const result = new Map<string, SpendingSummary>();
  for (const p of history) {
    const summary = result.get(p.username) ?? { counts: { S: 0, A: 0, B: 0, C: 0, D: 0 }, spent: 0 };
    const tier = tierByName.get(p.pokemonName);
    if (tier) summary.counts[tier] += 1;
    summary.spent += p.price ?? 0;
    result.set(p.username, summary);
  }
  return result;
}
```

`src/utils/draftSetup.ts`:

```ts
import type { DraftConfigPayload } from '../api/pokemons';

/** Formulario de la preparación del draft: lo que se guarda con PUT draft/config. */
export type SetupForm = DraftConfigPayload;

const PRICES = ['priceS', 'priceA', 'priceB', 'priceC', 'priceD'] as const;

export function sameSetup(a: SetupForm, b: SetupForm): boolean {
  return a.budget === b.budget
    && PRICES.every((k) => a[k] === b[k])
    && a.snake === b.snake
    && a.turnOrder.length === b.turnOrder.length
    && a.turnOrder.every((u, i) => u === b.turnOrder[i]);
}

/** Mismas reglas que UpdateDraftConfigCommandHandler, para avisar antes de enviar. */
export function setupError(form: SetupForm): string | null {
  if (!(form.budget > 0)) return 'El presupuesto tiene que ser mayor que 0';
  if (PRICES.some((k) => form[k] < 0)) return 'Los precios no pueden ser negativos';
  if (PRICES.some((k) => !Number.isInteger(form[k])) || !Number.isInteger(form.budget)) {
    return 'Los precios tienen que ser números enteros';
  }
  return null;
}
```

- [ ] **Step 4: Ejecutar** — PASS.

- [ ] **Step 5: Commit** — `feat(draft): utilidades de presupuesto y del formulario de preparación`

---

### Task 3: Tablero en snake

**Files:**
- Modify: `src/utils/draftBoard.ts`
- Test: `src/utils/draftBoard.test.ts`

**Interfaces:**
- Produces: `BuildDraftBoardInput.snake?: boolean`. `pickNumber` cuenta en serpiente cuando `snake` es true.

- [ ] **Step 1: Test**

```ts
  it('en snake las rondas pares se numeran de derecha a izquierda', () => {
    const board = buildDraftBoard({ history: [], turnOrder: ORDER, totalRounds: 2, snake: true });
    expect(board.rounds[0].cells.map((c) => c.pickNumber)).toEqual([1, 2, 3]);
    expect(board.rounds[1].cells.map((c) => c.pickNumber)).toEqual([6, 5, 4]);
  });
```

- [ ] **Step 2: Ejecutar y ver que falla.**

- [ ] **Step 3: Implementar**

En `BuildDraftBoardInput` añadir:

```ts
  /** Draft snake: las rondas pares van al revés, así que su número de pick se cuenta desde la derecha. */
  snake?: boolean;
```

Desestructurar `snake = false` y cambiar `pickNumber` por:

```ts
        pickNumber: i * turnOrder.length + (snake && round % 2 === 0 ? turnOrder.length - 1 - col : col) + 1,
```

Actualizar el comentario de `BoardCell.pickNumber`: "Número global del pick (en snake, las rondas pares se cuentan al revés)."

- [ ] **Step 4: Ejecutar** — PASS.

- [ ] **Step 5: Commit** — `feat(draft): numeración snake en el tablero`

---

### Task 4: Fase "Preparando draft" y nominaciones cerradas

**Files:**
- Modify: `src/utils/leaguePhase.ts`, `src/utils/leagueNav.ts`, `src/utils/home.ts`, `src/pages/PoolPage.tsx`
- Test: `src/utils/leaguePhase.test.ts`, `src/utils/leagueNav.test.ts`, `src/pages/PoolPage.test.tsx`

**Interfaces:**
- Produces: `LeaguePhase` incluye `'preparing'` (`leaguePhase('PENDING') === 'preparing'`), `LEAGUE_PHASES.preparing = { label: 'Preparando draft', badge: 'green' }`, `leagueTabs('preparing') = [DRAFT, POOL, MEMBERS]`.

- [ ] **Step 1: Tests**

`leaguePhase.test.ts`: sustituir el primer `it` por

```ts
  it('sin draft es preparación de la liga', () => {
    expect(leaguePhase(undefined)).toBe('setup');
    expect(leaguePhase(null)).toBe('setup');
  });

  it('draft pendiente es preparación del draft', () => {
    expect(leaguePhase('PENDING')).toBe('preparing');
    expect(LEAGUE_PHASES.preparing).toEqual({ label: 'Preparando draft', badge: 'green' });
  });
```

`leagueNav.test.ts`: añadir

```ts
  it('preparando el draft, el draft va primero', () => {
    expect(leagueTabs('preparing').map((t) => t.path)).toEqual(['draft', 'pool', 'members']);
    expect(firstTab('preparing')).toBe('draft');
  });
```

(importar `firstTab` si hace falta).

`PoolPage.test.tsx`: el mock por defecto pasa de `PENDING` a `null` (sin draft: nominaciones abiertas) y se añade:

```ts
  it('con el draft en preparación las nominaciones están cerradas', async () => {
    api.getDraftStatus.mockResolvedValue(PENDING);
    renderPage();
    expect(await screen.findByText('Nominaciones cerradas: se está preparando el draft')).toBeInTheDocument();
  });
```

(Usar el helper de render que ya tenga el fichero; si se llama distinto, el suyo.)

- [ ] **Step 2: Ejecutar y ver que falla.**

- [ ] **Step 3: Implementar**

`leaguePhase.ts`:

```ts
export type LeaguePhase = 'setup' | 'preparing' | 'draft' | 'season' | 'cancelled';

export function leaguePhase(draftStatus: LeagueDraftStatus | undefined): LeaguePhase {
  switch (draftStatus) {
    case 'PENDING': return 'preparing';
    case 'IN_PROGRESS': return 'draft';
    case 'COMPLETED': return 'season';
    case 'CANCELLED': return 'cancelled';
    default: return 'setup';
  }
}
```

y `preparing: { label: 'Preparando draft', badge: 'green' }` en `LEAGUE_PHASES`.

`leagueNav.ts`: `case 'preparing': return [DRAFT, POOL, MEMBERS];` antes del `default`.

`home.ts`: `const URGENCY: Record<LeaguePhase, number> = { draft: 0, preparing: 1, season: 1, setup: 2, cancelled: 2 };`

`PoolPage.tsx`:

```ts
  // Misma regla que NominatePokemonCommandHandler: solo se nomina mientras la liga no tiene draft
  const nominationsClosed = !!draftStatus;
```

y, justo encima de la rejilla de cards, cuando `draftStatus?.status === 'PENDING'`:

```tsx
        {draftStatus?.status === 'PENDING' && (
          <Notice variant="info">Nominaciones cerradas: se está preparando el draft</Notice>
        )}
```

(importar `Notice` de `../components/Notice`).

- [ ] **Step 4: Ejecutar** — `npx vitest run src/utils src/pages/PoolPage.test.tsx src/pages/HomePage.test.tsx` → PASS; `tsc --noEmit` sin errores (el `Record<LeaguePhase, …>` obliga a cubrir la fase nueva en todos los sitios).

- [ ] **Step 5: Commit** — `feat(draft): fase "Preparando draft" y nominaciones cerradas al prepararlo`

---

### Task 5: Tablero con presupuesto, precios y resumen de gasto

**Files:**
- Modify: `src/components/draft/DraftBoard.tsx`, `src/index.css`
- Test: `src/components/draft/DraftBoard.test.tsx`

**Interfaces:**
- Consumes: `SpendingSummary` (Task 2).
- Produces: props nuevas opcionales de `DraftBoard`: `budgets?: Record<string, number> | null` (restante por jugador, en la cabecera), `spending?: Map<string, SpendingSummary> | null` (fila de resumen en `<tfoot>`). El precio de cada casilla sale de `cell.pick.price`.

- [ ] **Step 1: Test**

Añadir en `DraftBoard.test.tsx` (con el `board` que ya construya el fichero; si no hay, construirlo con `buildDraftBoard`):

```tsx
  it('con presupuesto muestra lo que le queda a cada jugador, el precio de cada pick y el gasto por tiers', () => {
    const history = [{ username: 'ash', pokemonName: 'mew', pokemonId: 151, round: 1, pickedAt: '2026-09-29T10:00:00Z', price: 200 }];
    const board = buildDraftBoard({ history, turnOrder: ['ash', 'brock'] });
    render(
      <DraftBoard
        board={board}
        me="ash"
        tierByName={new Map([['mew', 'S']])}
        onSelect={() => {}}
        budgets={{ ash: 800, brock: 1000 }}
        spending={new Map([['ash', { counts: { S: 1, A: 0, B: 0, C: 0, D: 0 }, spent: 200 }]])}
      />,
    );
    expect(screen.getByText('800')).toBeInTheDocument();
    expect(screen.getByLabelText('Ronda 1, pick 1: ash eligió Mew por 200 monedas')).toBeInTheDocument();
    expect(screen.getByLabelText('ash: 1 S, 0 A, 0 B, 0 C, 0 D; gastado 200 monedas')).toBeInTheDocument();
  });
```

- [ ] **Step 2: Ejecutar y ver que falla.**

- [ ] **Step 3: Implementar**

En `DraftBoard.tsx`:
- Props nuevas (Interfaces) e import de `coinsLabel` y `TIER_ORDER`, `type SpendingSummary`.
- `cellLabel`: tras el nombre, `${cell.pick.price != null ? \` por ${coinsLabel(cell.pick.price)}\` : ''}`.
- En cada `<th>` de jugador, debajo del nombre:

```tsx
                {budgets && budgets[player] !== undefined && (
                  <span className="draft-board-budget" title="Monedas que le quedan">{budgets[player]}</span>
                )}
```

- En la casilla con pick, tras el nombre:

```tsx
                      {cell.pick.price != null && (
                        <span className="draft-board-price" aria-hidden="true">{cell.pick.price}</span>
                      )}
```

- Tras `</tbody>`:

```tsx
        {spending && spending.size > 0 && (
          <tfoot>
            <tr>
              <th scope="row" aria-label="Resumen">Σ</th>
              {board.players.map((player) => {
                const s = spending.get(player);
                if (!s) return <td key={player} />;
                const label = `${player}: ${TIER_ORDER.map((t) => `${s.counts[t]} ${t}`).join(', ')}; gastado ${coinsLabel(s.spent)}`;
                return (
                  <td key={player} className="draft-board-summary" aria-label={label}>
                    <span aria-hidden="true">{TIER_ORDER.map((t) => `${t}${s.counts[t]}`).join(' · ')}</span>
                    <span aria-hidden="true">{s.spent} 🪙</span>
                  </td>
                );
              })}
            </tr>
          </tfoot>
        )}
```

`src/index.css`, junto a las reglas `.draft-board-*`:

```css
.draft-board-budget { display: block; font-size: 0.7rem; font-weight: 600; color: var(--text-2); }
.draft-board-price { font-size: 0.7rem; color: var(--text-3); }
.draft-board-summary { font-size: 0.7rem; color: var(--text-2); display: flex; flex-direction: column; gap: 2px; text-align: center; }
```

(Si `td` con `display: flex` rompe la tabla en el navegador, envolver el contenido en un `<div>` con esa clase en vez de ponerla en el `td`.)

- [ ] **Step 4: Ejecutar** — `npx vitest run src/components/draft` → PASS.

- [ ] **Step 5: Commit** — `feat(draft): presupuesto, precios y gasto por jugador en el tablero`

---

### Task 6: `TurnOrderEditor` y "Preparar draft" en Miembros

**Files:**
- Create: `src/components/draft/TurnOrderEditor.tsx`, `src/components/draft/TurnOrderEditor.test.tsx`
- Modify: `src/pages/LeagueMembersPage.tsx`, `src/api/pokemons.ts` (borrar `startDraft`)
- Test: `src/pages/LeagueMembersPage.test.tsx`

**Interfaces:**
- Consumes: `moveTurn`, `shuffleTurnOrder` (`utils/turnOrder.ts`), `prepareDraft` (Task 1).
- Produces: `TurnOrderEditor({ order, onChange, disabled }: { order: string[]; onChange: (next: string[]) => void; disabled?: boolean })`: el marcado actual de Miembros (toolbar con "Barajar", lista con número, avatar, nombre y flechas "Subir a X"/"Bajar a X").

- [ ] **Step 1: Tests**

`TurnOrderEditor.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TurnOrderEditor from './TurnOrderEditor';

describe('TurnOrderEditor', () => {
  it('sube, baja y baraja sin perder a nadie', async () => {
    const onChange = vi.fn();
    render(<TurnOrderEditor order={['ash', 'misty', 'brock']} onChange={onChange} />);

    await userEvent.click(screen.getByRole('button', { name: 'Subir a misty' }));
    expect(onChange).toHaveBeenLastCalledWith(['misty', 'ash', 'brock']);

    await userEvent.click(screen.getByRole('button', { name: 'Bajar a misty' }));
    expect(onChange).toHaveBeenLastCalledWith(['ash', 'brock', 'misty']);

    const random = vi.spyOn(Math, 'random').mockReturnValue(0);
    await userEvent.click(screen.getByRole('button', { name: 'Barajar' }));
    expect(onChange).toHaveBeenLastCalledWith(['misty', 'brock', 'ash']);
    random.mockRestore();
  });
});
```

(Si `UserAvatar` necesita el contexto de versiones de avatar, envolver como lo haga `LeagueMembersPage.test.tsx`.)

`LeagueMembersPage.test.tsx`: los dos tests de orden de turnos ("un miembro añadido después…" y "Barajar reordena…") se borran (su lógica ya la cubren `turnOrder.test.ts` y `TurnOrderEditor.test.tsx`). El mock `startDraft` pasa a `prepareDraft`. Añadir:

```tsx
  it('el admin prepara el draft y va a la pantalla de preparación', async () => {
    prepareDraft.mockResolvedValue(undefined);
    renderPage();
    await userEvent.click(await screen.findByRole('button', { name: /Preparar draft/ }));
    await waitFor(() => expect(prepareDraft).toHaveBeenCalledWith('l1'));
    expect(await screen.findByText('Pantalla de preparación')).toBeInTheDocument();
  });

  it('con el draft en preparación enlaza a continuar la preparación', async () => {
    draftStatus.mockResolvedValue({ id: 'd1', status: 'PENDING', turnOrder: ['ash'], currentTurn: null, currentRound: 1, picks: [] });
    renderPage();
    expect(await screen.findByRole('link', { name: 'Continuar la preparación' })).toHaveAttribute('href', '/leagues/l1/draft/setup');
  });
```

En el router del test, añadir la ruta `{ path: '/leagues/:leagueId/draft/setup', element: <p>Pantalla de preparación</p> }` (o `<Route>` equivalente según monte el fichero). Adaptar `draftStatus` al nombre del mock de `getDraftStatus` del fichero.

- [ ] **Step 2: Ejecutar y ver que falla.**

- [ ] **Step 3: Implementar**

`TurnOrderEditor.tsx`: mover el bloque JSX de `LeagueMembersPage` (desde `turn-order-toolbar` hasta el final de `turn-order-list`), cambiando `setArrangedOrder(...)` por `onChange(...)` y `turnOrder` por `order`, y pasando `disabled` a los botones (`disabled={disabled || ...}`).

`LeagueMembersPage.tsx`:
- Quitar `arrangedOrder`, `turnOrder`, imports de `utils/turnOrder` y `startDraft`.
- `const draftInSetup = draft?.status === 'PENDING';`
- Mutación:

```tsx
  const { mutate: prepare, isPending: preparing } = useMutation({
    mutationFn: () => prepareDraft(leagueId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['draft-status', leagueId] });
      queryClient.invalidateQueries({ queryKey: ['closed-list', leagueId] });
      navigate(`/leagues/${leagueId}/draft/setup`);
    },
    onError: (err) => addToast('error', extractErrorMessage(err, 'No se pudo preparar el draft')),
  });
```

- Sustituir el bloque "Iniciar draft" por:

```tsx
        {isAdmin && !draftActive && (
          <>
            <hr className="divider" />
            <p className="section-label">Draft</p>
            {draftInSetup ? (
              <Link className="btn-primary turn-order-start" to={`/leagues/${leagueId}/draft/setup`}>
                Continuar la preparación
              </Link>
            ) : (
              <>
                <p className="turn-order-hint">
                  Reparte los tiers, pon precios y presupuesto, y ordena los turnos. Al prepararlo se cierran las nominaciones.
                </p>
                <button className="btn-primary turn-order-start" disabled={preparing} onClick={() => prepare()}>
                  {preparing ? 'Preparando...' : 'Preparar draft'}
                </button>
              </>
            )}
          </>
        )}
```

(importar `Link` de `react-router-dom`).

`src/api/pokemons.ts`: borrar `startDraft` (ya no tiene usos: `git grep -n "startDraft(" src` solo debe devolver nada).

- [ ] **Step 4: Ejecutar** — `npx vitest run src/components/draft src/pages/LeagueMembersPage.test.tsx` → PASS; `tsc --noEmit`.

- [ ] **Step 5: Commit** — `feat(draft): preparar el draft desde Miembros`

---

### Task 7: Pantalla de preparación (`DraftSetupPage`)

**Files:**
- Create: `src/components/draftSetup/DraftBudgetForm.tsx`, `src/components/draftSetup/SetupTierBoard.tsx`, `src/pages/DraftSetupPage.tsx`, `src/pages/DraftSetupPage.test.tsx`
- Modify: `src/App.tsx` (ruta), `src/index.css`

**Interfaces:**
- Consumes: `getDraftStatus`, `getClosedList`, `updateDraftConfig`, `setDraftPoolTiers`, `resetDraftPoolTiers`, `startPreparedDraft`, `cancelDraft` (`api/pokemons`); `getLeagueDetail`, `getLeagueSettings` (`api/leagues`); `SetupForm`, `sameSetup`, `setupError` (Task 2); `coverageHint` (Task 2); `TurnOrderEditor` (Task 6); `syncTurnOrder` (`utils/turnOrder`); `ConfirmDialog`, `Notice`, `TierBadge`.
- Produces:
  - `DraftBudgetForm({ form, onChange, disabled }: { form: SetupForm; onChange: (patch: Partial<SetupForm>) => void; disabled?: boolean })`.
  - `SetupTierBoard({ pool, config, onMove, moving, readOnly }: { pool: ClosedListEntry[]; config: DraftConfig; onMove?: (entryIds: string[], tier: Tier) => void; moving?: boolean; readOnly?: boolean })`. Con `readOnly` no hay selección ni barra (lo usa `DraftPage` en Task 8).
  - Ruta `draft/setup` dentro de las subrutas de `/leagues/:leagueId`.

- [ ] **Step 1: Tests de la página**

`src/pages/DraftSetupPage.test.tsx` (router de datos por `useBlocker`, igual que `LeagueConfigPage.test.tsx`):

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import DraftSetupPage from './DraftSetupPage';
import { useAuthStore } from '../store/authStore';
import * as leaguesApi from '../api/leagues';
import * as pokemonsApi from '../api/pokemons';
import type { ClosedListEntry, DraftStatus } from '../api/pokemons';

vi.mock('../api/leagues', async (importOriginal) => ({
  ...(await importOriginal<typeof leaguesApi>()),
  getLeagueDetail: vi.fn(),
  getLeagueSettings: vi.fn(),
}));
vi.mock('../api/pokemons', async (importOriginal) => ({
  ...(await importOriginal<typeof pokemonsApi>()),
  getDraftStatus: vi.fn(),
  getClosedList: vi.fn(),
  updateDraftConfig: vi.fn(),
  setDraftPoolTiers: vi.fn(),
  resetDraftPoolTiers: vi.fn(),
  startPreparedDraft: vi.fn(),
  cancelDraft: vi.fn(),
}));

const api = vi.mocked(pokemonsApi);
const CONFIG = { budget: 1000, priceS: 200, priceA: 150, priceB: 100, priceC: 60, priceD: 30, snake: false };
const DRAFT: DraftStatus = {
  id: 'd1', status: 'PENDING', turnOrder: ['ash', 'misty'], currentTurn: null, currentRound: 1, picks: [],
  config: CONFIG, budgets: { ash: 1000, misty: 1000 },
};
const entry = (id: string, pokemonName: string, tier: 'S' | 'D'): ClosedListEntry => ({
  id, pokemonId: 1, pokemonName, nominatedBy: 'ash', sprite: '', tier,
});

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = createMemoryRouter([
    { path: '/leagues/:leagueId/draft/setup', element: <DraftSetupPage /> },
    { path: '/leagues/:leagueId/draft', element: <p>Pantalla del draft</p> },
    { path: '/leagues/:leagueId/pool', element: <p>Pantalla del pool</p> },
  ], { initialEntries: ['/leagues/l1/draft/setup'] });
  render(<QueryClientProvider client={queryClient}><RouterProvider router={router} /></QueryClientProvider>);
  return router;
}

describe('DraftSetupPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ username: 'ash' });
    vi.mocked(leaguesApi.getLeagueDetail).mockResolvedValue({
      id: 'l1', name: 'Liga', createdBy: 'ash', status: 'SETUP',
      members: [{ username: 'ash', leagueRole: 'ADMIN' }, { username: 'misty', leagueRole: 'USER' }],
    });
    vi.mocked(leaguesApi.getLeagueSettings).mockResolvedValue({
      coinsPerWin: 100, coinsPerLoss: 50, priceTierS: 0, priceTierA: 0, priceTierB: 0, priceTierC: 0, priceTierD: 0,
      tierPctS: 20, tierPctA: 20, tierPctB: 20, tierPctC: 20, tierPctD: 20, maxTeamSize: 10,
    });
    api.getDraftStatus.mockResolvedValue(DRAFT);
    api.getClosedList.mockResolvedValue([entry('e1', 'mew', 'S'), entry('e2', 'mewtwo', 'S'), entry('e3', 'abra', 'D')]);
    api.updateDraftConfig.mockResolvedValue(undefined);
    api.setDraftPoolTiers.mockResolvedValue(undefined);
    api.startPreparedDraft.mockResolvedValue(undefined);
  });

  it('mueve los Pokémon seleccionados a otro tier', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole('button', { name: 'Mew, tier S, 200 monedas' }));
    await user.click(screen.getByRole('button', { name: 'Mewtwo, tier S, 200 monedas' }));
    await user.click(screen.getByRole('button', { name: 'Mover 2 a A' }));
    await waitFor(() => expect(api.setDraftPoolTiers).toHaveBeenCalledWith('l1', ['e1', 'e2'], 'A'));
  });

  it('guarda presupuesto, precios, snake y orden', async () => {
    const user = userEvent.setup();
    renderPage();
    const budget = await screen.findByLabelText('Presupuesto por jugador');
    await user.clear(budget);
    await user.type(budget, '800');
    await user.click(screen.getByRole('checkbox', { name: /Snake/ }));
    await user.click(screen.getByRole('button', { name: 'Guardar' }));
    await waitFor(() => expect(api.updateDraftConfig).toHaveBeenCalledWith('l1', {
      ...CONFIG, budget: 800, snake: true, turnOrder: ['ash', 'misty'],
    }));
  });

  it('con cambios sin guardar no deja empezar y pide confirmación al salir', async () => {
    const user = userEvent.setup();
    const router = renderPage();
    const budget = await screen.findByLabelText('Presupuesto por jugador');
    await user.clear(budget);
    await user.type(budget, '800');
    expect(screen.getByRole('button', { name: 'Empezar draft' })).toBeDisabled();
    await act(async () => {});
    await act(async () => { await router.navigate('/leagues/l1/pool'); });
    expect(screen.getByText('¿Salir sin guardar?')).toBeInTheDocument();
  });

  it('orden con un miembro nuevo cuenta como cambio sin guardar', async () => {
    vi.mocked(leaguesApi.getLeagueDetail).mockResolvedValue({
      id: 'l1', name: 'Liga', createdBy: 'ash', status: 'SETUP',
      members: [{ username: 'ash', leagueRole: 'ADMIN' }, { username: 'misty', leagueRole: 'USER' }, { username: 'brock', leagueRole: 'USER' }],
    });
    renderPage();
    expect(await screen.findByRole('button', { name: 'Empezar draft' })).toBeDisabled();
    expect(screen.getByText('brock')).toBeInTheDocument();
  });

  it('empieza el draft y va a la pantalla del draft', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole('button', { name: 'Empezar draft' }));
    await user.click(screen.getByRole('button', { name: 'Empezar' }));
    await waitFor(() => expect(api.startPreparedDraft).toHaveBeenCalledWith('l1'));
    expect(await screen.findByText('Pantalla del draft')).toBeInTheDocument();
  });

  it('muestra el aviso de cobertura del presupuesto', async () => {
    renderPage();
    expect(await screen.findByText(/Con 1000 monedas llega para 33 Pokémon del tier más barato \(D, 30\)/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Ejecutar y ver que falla** — `npx vitest run src/pages/DraftSetupPage.test.tsx`.

- [ ] **Step 3: Implementar**

`DraftBudgetForm.tsx`:

```tsx
import type { SetupForm } from '../../utils/draftSetup';
import { TIER_ORDER } from '../../utils/tiers';

interface DraftBudgetFormProps {
  form: SetupForm;
  onChange: (patch: Partial<SetupForm>) => void;
  disabled?: boolean;
}

const PRICE_KEY = { S: 'priceS', A: 'priceA', B: 'priceB', C: 'priceC', D: 'priceD' } as const;

/** Presupuesto por jugador, precio de cada tier y modo snake de la preparación del draft. */
export default function DraftBudgetForm({ form, onChange, disabled }: DraftBudgetFormProps) {
  return (
    <div className="draft-budget-form">
      <label className="config-field">
        <span>Presupuesto por jugador</span>
        <input
          className="search-input" type="number" min={1} step={1} value={form.budget} disabled={disabled}
          onChange={(e) => onChange({ budget: Number(e.target.value) })}
        />
      </label>
      <div className="draft-price-row">
        {TIER_ORDER.map((tier) => (
          <label key={tier} className="draft-price-field">
            <span className={`tier-badge tier-badge-${tier.toLowerCase()}`} style={{ position: 'static' }}>{tier}</span>
            <input
              className="search-input" type="number" min={0} step={1} value={form[PRICE_KEY[tier]]} disabled={disabled}
              aria-label={`Precio del tier ${tier}`}
              onChange={(e) => onChange({ [PRICE_KEY[tier]]: Number(e.target.value) })}
            />
          </label>
        ))}
      </div>
      <label className="draft-snake-toggle">
        <input
          type="checkbox" checked={form.snake} disabled={disabled}
          onChange={(e) => onChange({ snake: e.target.checked })}
        />
        <span>Snake: el orden se invierte en cada ronda</span>
      </label>
    </div>
  );
}
```

`SetupTierBoard.tsx`:

```tsx
import { useState } from 'react';
import type { ClosedListEntry, DraftConfig, Tier } from '../../api/pokemons';
import { TIER_ORDER } from '../../utils/tiers';
import { TIER_COLORS } from '../../utils/colors';
import { draftPrice } from '../../utils/draftBudget';
import { coinsLabel } from '../../utils/coins';
import { spriteUrl } from '../../utils/sprites';

interface SetupTierBoardProps {
  pool: ClosedListEntry[];
  config: DraftConfig;
  onMove?: (entryIds: string[], tier: Tier) => void;
  moving?: boolean;
  /** Vista de los jugadores: sin selección ni barra de mover. */
  readOnly?: boolean;
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Pool por tiers con su precio. El admin selecciona Pokémon y los mueve de tier con la barra inferior. */
export default function SetupTierBoard({ pool, config, onMove, moving = false, readOnly = false }: SetupTierBoardProps) {
  const [activeTier, setActiveTier] = useState<Tier>('S');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');

  const entries = pool
    .filter((e) => e.tier === activeTier && e.pokemonName.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => a.pokemonName.localeCompare(b.pokemonName));

  const toggle = (id: string) => setSelected((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const move = (tier: Tier) => {
    onMove?.([...selected], tier);
    setSelected(new Set());
  };

  return (
    <div className="setup-tier-board">
      <div className="gen-tabs" role="tablist" aria-label="Tiers">
        {TIER_ORDER.map((t) => {
          const active = t === activeTier;
          const c = TIER_COLORS[t];
          return (
            <button
              key={t} type="button" role="tab" aria-selected={active}
              className={`gen-tab${active ? ' active' : ''}`}
              style={active ? { borderColor: c.text, background: c.bg, color: c.text } : {}}
              onClick={() => { setActiveTier(t); setSelected(new Set()); }}
            >
              {t} · {pool.filter((e) => e.tier === t).length} · {draftPrice(config, t)} 🪙
            </button>
          );
        })}
      </div>

      <input
        className="search-input" type="text" placeholder="Buscar Pokémon..." value={search}
        onChange={(e) => setSearch(e.target.value)} aria-label="Buscar Pokémon"
      />

      {entries.length === 0 ? (
        <p className="setup-tier-empty">No hay Pokémon en el tier {activeTier}.</p>
      ) : (
        <div className="pokemon-grid" role="tabpanel">
          {entries.map((e) => {
            const label = `${capitalize(e.pokemonName)}, tier ${activeTier}, ${coinsLabel(draftPrice(config, activeTier))}`;
            const isSelected = selected.has(e.id);
            const content = (
              <>
                <img src={spriteUrl(e.pokemonId)} alt="" className="pokemon-sprite" loading="lazy" />
                <span className="pokemon-name">{e.pokemonName}</span>
              </>
            );
            return readOnly ? (
              <div key={e.id} className="pokemon-card" aria-label={label}>{content}</div>
            ) : (
              <button
                key={e.id} type="button" aria-label={label} aria-pressed={isSelected}
                className={`pokemon-card setup-card${isSelected ? ' selected' : ''}`}
                onClick={() => toggle(e.id)}
              >
                {content}
              </button>
            );
          })}
        </div>
      )}

      {!readOnly && selected.size > 0 && (
        <div className="setup-move-bar" role="region" aria-label="Mover seleccionados">
          <span>{selected.size} seleccionados · Mover a:</span>
          {TIER_ORDER.filter((t) => t !== activeTier).map((t) => (
            <button
              key={t} type="button" className="btn-secondary" disabled={moving}
              aria-label={`Mover ${selected.size} a ${t}`} onClick={() => move(t)}
            >
              {t}
            </button>
          ))}
          <button type="button" className="btn-ghost" onClick={() => setSelected(new Set())}>Quitar selección</button>
        </div>
      )}
    </div>
  );
}
```

`DraftSetupPage.tsx`:

```tsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Navigate, useBlocker, useNavigate, useParams } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useToastStore } from '../store/toastStore';
import {
  cancelDraft, getClosedList, getDraftStatus, resetDraftPoolTiers, setDraftPoolTiers, startPreparedDraft,
  updateDraftConfig,
} from '../api/pokemons';
import type { DraftStatus, Tier } from '../api/pokemons';
import { getLeagueDetail, getLeagueSettings } from '../api/leagues';
import { extractErrorMessage } from '../utils/errorMessage';
import { sameSetup, setupError, type SetupForm } from '../utils/draftSetup';
import { coverageHint } from '../utils/draftBudget';
import { syncTurnOrder } from '../utils/turnOrder';
import DraftBudgetForm from '../components/draftSetup/DraftBudgetForm';
import SetupTierBoard from '../components/draftSetup/SetupTierBoard';
import TurnOrderEditor from '../components/draft/TurnOrderEditor';
import ConfirmDialog from '../components/ConfirmDialog';
import Notice from '../components/Notice';
import { SkeletonTable } from '../components/SkeletonTable';

type Pending = 'start' | 'reset' | 'back' | null;

export default function DraftSetupPage() {
  const { leagueId } = useParams<{ leagueId: string }>();
  const username = useAuthStore((s) => s.username);
  const addToast = useToastStore((s) => s.addToast);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [edits, setEdits] = useState<Partial<SetupForm>>({});
  const [confirm, setConfirm] = useState<Pending>(null);

  const { data: draft, isLoading } = useQuery({
    queryKey: ['draft-status', leagueId], queryFn: () => getDraftStatus(leagueId!), enabled: !!leagueId,
  });
  const { data: pool = [] } = useQuery({
    queryKey: ['closed-list', leagueId], queryFn: () => getClosedList(leagueId!), enabled: !!leagueId,
  });
  const { data: league } = useQuery({
    queryKey: ['league-detail', leagueId], queryFn: () => getLeagueDetail(leagueId!), enabled: !!leagueId,
  });
  const { data: settings } = useQuery({
    queryKey: ['league-settings', leagueId], queryFn: () => getLeagueSettings(leagueId!), enabled: !!leagueId,
    staleTime: 120_000,
  });
  const rounds = settings?.maxTeamSize ?? 10;

  const members = league?.members.map((m) => m.username) ?? [];
  const isAdmin = !!league?.members.some((m) => m.username === username && m.leagueRole === 'ADMIN');
  const saved: SetupForm | null = draft?.config ? { ...draft.config, turnOrder: draft.turnOrder } : null;
  const form: SetupForm | null = saved && {
    ...saved, ...edits, turnOrder: syncTurnOrder(edits.turnOrder ?? saved.turnOrder, members),
  };
  const dirty = !!form && !!saved && !sameSetup(form, saved);
  const error = form ? setupError(form) : null;
  const hint = form ? coverageHint(form, rounds, pool.map((e) => e.tier).filter((t): t is Tier => !!t)) : null;

  const blocker = useBlocker(({ currentLocation, nextLocation }) =>
    dirty && currentLocation.pathname !== nextLocation.pathname);

  const refreshDraft = () => queryClient.invalidateQueries({ queryKey: ['draft-status', leagueId] });
  const refreshPool = () => queryClient.invalidateQueries({ queryKey: ['closed-list', leagueId] });

  const { mutate: save, isPending: saving } = useMutation({
    mutationFn: (payload: SetupForm) => updateDraftConfig(leagueId!, payload),
    onSuccess: (_data, payload) => {
      const { turnOrder, ...config } = payload;
      // Lo guardado pasa a ser la referencia ya: sin esto, salir antes del refetch pediría confirmación
      queryClient.setQueryData<DraftStatus | null>(['draft-status', leagueId],
        (old) => old && { ...old, config, turnOrder });
      setEdits({});
      refreshDraft();
      addToast('success', 'Configuración del draft guardada');
    },
    onError: (err) => addToast('error', extractErrorMessage(err, 'No se pudo guardar la configuración')),
  });

  const { mutate: move, isPending: moving } = useMutation({
    mutationFn: ({ ids, tier }: { ids: string[]; tier: Tier }) => setDraftPoolTiers(leagueId!, ids, tier),
    onSuccess: (_data, { ids, tier }) => {
      refreshPool();
      addToast('success', `${ids.length} Pokémon al tier ${tier}`);
    },
    onError: (err) => addToast('error', extractErrorMessage(err, 'No se pudieron mover los Pokémon')),
  });

  const { mutate: reset, isPending: resetting } = useMutation({
    mutationFn: () => resetDraftPoolTiers(leagueId!),
    onSuccess: () => { setConfirm(null); refreshPool(); addToast('success', 'Tiers recalculados por BST'); },
    onError: (err) => { setConfirm(null); addToast('error', extractErrorMessage(err, 'No se pudieron recalcular los tiers')); },
  });

  const { mutate: start, isPending: starting } = useMutation({
    mutationFn: () => startPreparedDraft(leagueId!),
    onSuccess: () => {
      setConfirm(null);
      refreshDraft();
      queryClient.invalidateQueries({ queryKey: ['league-detail', leagueId] });
      navigate(`/leagues/${leagueId}/draft`);
    },
    onError: (err) => { setConfirm(null); addToast('error', extractErrorMessage(err, 'No se pudo empezar el draft')); },
  });

  const { mutate: back, isPending: goingBack } = useMutation({
    mutationFn: () => cancelDraft(leagueId!),
    onSuccess: () => {
      setConfirm(null);
      refreshDraft();
      queryClient.invalidateQueries({ queryKey: ['league-detail', leagueId] });
      navigate(`/leagues/${leagueId}/pool`);
    },
    onError: (err) => { setConfirm(null); addToast('error', extractErrorMessage(err, 'No se pudo volver a nominaciones')); },
  });

  if (isLoading || !league) return <main className="page-content"><SkeletonTable rows={4} /></main>;
  // Solo el admin y solo con el draft en preparación; el resto, a la pantalla del draft.
  if (!isAdmin || draft?.status !== 'PENDING' || !form) return <Navigate to={`/leagues/${leagueId}/draft`} replace />;

  return (
    <>
      <main className="page-content draft-setup">
        <div className="section-header">
          <h1 className="page-title">Preparar draft</h1>
          <span className="draft-setup-meta">{rounds} rondas · {pool.length} Pokémon en el pool</span>
        </div>

        <p className="section-label">Presupuesto y precios</p>
        <DraftBudgetForm form={form} onChange={(patch) => setEdits((prev) => ({ ...prev, ...patch }))} />
        {hint && <Notice variant={hint.tone === 'warning' ? 'warning' : 'info'}>{hint.text}</Notice>}

        <p className="section-label">Orden de turnos</p>
        <TurnOrderEditor order={form.turnOrder} onChange={(turnOrder) => setEdits((prev) => ({ ...prev, turnOrder }))} />

        <div className="draft-setup-save">
          {error && <p className="error" role="alert">{error}</p>}
          <button className="btn-primary" disabled={!dirty || !!error || saving} onClick={() => save(form)}>
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>

        <hr className="divider" />
        <div className="section-header">
          <p className="section-label">Tiers</p>
          <button className="btn-ghost" onClick={() => setConfirm('reset')}>Recalcular por BST</button>
        </div>
        <SetupTierBoard pool={pool} config={form} moving={moving} onMove={(ids, tier) => move({ ids, tier })} />

        <hr className="divider" />
        <div className="draft-setup-actions">
          <button className="btn-danger" onClick={() => setConfirm('back')}>Volver a nominaciones</button>
          <button
            className="btn-primary" disabled={dirty} title={dirty ? 'Guarda los cambios antes de empezar' : undefined}
            onClick={() => setConfirm('start')}
          >
            Empezar draft
          </button>
        </div>
      </main>

      {confirm === 'start' && (
        <ConfirmDialog
          title="¿Empezar el draft?" message="Ya no se podrán cambiar los tiers, los precios ni el orden de turnos."
          confirmLabel="Empezar" pendingLabel="Empezando..." pending={starting}
          onConfirm={() => start()} onClose={() => setConfirm(null)}
        />
      )}
      {confirm === 'reset' && (
        <ConfirmDialog
          title="¿Recalcular los tiers?" message="Se vuelven a repartir por BST y se pierden los cambios hechos a mano."
          confirmLabel="Recalcular" pendingLabel="Recalculando..." pending={resetting}
          onConfirm={() => reset()} onClose={() => setConfirm(null)}
        />
      )}
      {confirm === 'back' && (
        <ConfirmDialog
          title="¿Volver a nominaciones?" message="Se descarta la preparación y se reabren las nominaciones."
          confirmLabel="Volver" pendingLabel="Volviendo..." pending={goingBack} danger
          onConfirm={() => back()} onClose={() => setConfirm(null)}
        />
      )}
      {blocker.state === 'blocked' && (
        <ConfirmDialog
          title="¿Salir sin guardar?" message="Hay cambios en la configuración del draft que no se han guardado."
          confirmLabel="Salir" pendingLabel="Saliendo..." pending={false} danger
          onConfirm={() => blocker.proceed()} onClose={() => blocker.reset()}
        />
      )}
    </>
  );
}
```

Notas:
- "Volver a nominaciones" navega fuera y **no** debe bloquearse: `setEdits({})` antes de `back()` si hay cambios. Cambiar `onConfirm={() => back()}` por `onConfirm={() => { setEdits({}); back(); }}`; igual en `start` no hace falta porque "Empezar" está deshabilitado con cambios.
- La etiqueta de la card en el test es `Mew, tier S, 200 monedas`: coincide con `label` de `SetupTierBoard`.

`App.tsx`: dentro de las subrutas de `/leagues/:leagueId`, junto a `draft`:

```tsx
      { path: 'draft/setup', element: <DraftSetupPage /> },
```

`src/index.css`:

```css
.draft-setup-meta { font-size: 0.85rem; color: var(--text-2); }
.draft-price-row { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 0.5rem; margin: 0.75rem 0; }
.draft-price-field { display: flex; flex-direction: column; align-items: center; gap: 0.35rem; }
.draft-snake-toggle { display: flex; align-items: center; gap: 0.5rem; font-size: 0.9rem; margin-bottom: 0.75rem; }
.draft-setup-save, .draft-setup-actions { display: flex; justify-content: flex-end; align-items: center; gap: 0.75rem; margin-top: 1rem; }
.draft-setup-actions { justify-content: space-between; }
.setup-card { cursor: pointer; font: inherit; }
.setup-card.selected { border-color: var(--accent); box-shadow: 0 0 0 2px var(--accent); }
.setup-card:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
.setup-tier-empty { color: var(--text-3); font-size: 0.875rem; }
.setup-move-bar {
  position: sticky; bottom: 0.75rem; display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem;
  padding: 0.6rem 0.9rem; margin-top: 1rem; border-radius: 12px;
  background: var(--surface-2); border: 1px solid var(--border);
}
@media (max-width: 480px) { .draft-price-row { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
```

(Si algún token no existe en `index.css`, usar el equivalente que sí exista; `--accent`, `--surface-2`, `--border`, `--text-2`, `--text-3` se usan ya en el código.)

- [ ] **Step 4: Ejecutar** — `npx vitest run src/pages/DraftSetupPage.test.tsx` → PASS; `tsc --noEmit`, `npm run lint`.

- [ ] **Step 5: Verificar en el navegador**

`npm run dev` con `VITE_API_URL` apuntando a un backend local de la rama (o dejar para la verificación final con el backend desplegado en staging si no hay back local). Comprobar a 375 px: precios en 3 columnas, barra de mover visible y sin scroll horizontal; modo oscuro legible.

- [ ] **Step 6: Commit** — `feat(draft): pantalla de preparación del draft`

---

### Task 8: `DraftPage` con preparación, precios y presupuesto

**Files:**
- Modify: `src/pages/DraftPage.tsx`, `src/index.css`
- Test: `src/pages/DraftPage.test.tsx`

**Interfaces:**
- Consumes: `draftPrice`, `remainingBudget`, `canAfford`, `spendingByPlayer` (Task 2); `SetupTierBoard` con `readOnly` (Task 7); props nuevas de `DraftBoard` (Task 5); `snake` de `buildDraftBoard` (Task 3).

- [ ] **Step 1: Tests**

Añadir en `DraftPage.test.tsx` (helpers `draft` y `pick` ya existen; `pick` acepta un `price` opcional con spread):

```tsx
  const CONFIG = { budget: 300, priceS: 200, priceA: 150, priceB: 100, priceC: 60, priceD: 30, snake: false };
  const entry = (id: string, pokemonName: string, tier: 'S' | 'D') => ({
    id, pokemonId: 1, pokemonName, nominatedBy: 'ash', sprite: '', tier,
  });

  it('en preparación los jugadores ven los tiers y los precios', async () => {
    useAuthStore.setState({ username: 'brock' });
    vi.mocked(pokemonsApi.getClosedList).mockResolvedValue([entry('e1', 'mew', 'S')]);
    vi.mocked(pokemonsApi.getDraftStatus).mockResolvedValue(draft({ status: 'PENDING', config: CONFIG, budgets: { ash: 300, brock: 300 } }));
    renderPage();
    expect(await screen.findByText('El admin está preparando el draft')).toBeInTheDocument();
    expect(screen.getByLabelText('Mew, tier S, 200 monedas')).toBeInTheDocument();
  });

  it('en tu turno ves lo que te queda y lo que no puedes pagar sale deshabilitado', async () => {
    vi.mocked(pokemonsApi.getClosedList).mockResolvedValue([entry('e1', 'mew', 'S'), entry('e2', 'abra', 'D')]);
    vi.mocked(pokemonsApi.getDraftStatus).mockResolvedValue(draft({
      status: 'IN_PROGRESS', currentTurn: 'ash', config: CONFIG, budgets: { ash: 100, brock: 300 },
    }));
    renderPage();
    expect(await screen.findByText('Te quedan')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mew, 200 monedas, no te llega' })).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByRole('button', { name: 'Abra, 30 monedas' })).not.toHaveAttribute('aria-disabled', 'true');
  });

  it('el modal de confirmación dice cuánto te quedará', async () => {
    vi.mocked(pokemonsApi.getClosedList).mockResolvedValue([entry('e2', 'abra', 'D')]);
    vi.mocked(pokemonsApi.getDraftStatus).mockResolvedValue(draft({
      status: 'IN_PROGRESS', currentTurn: 'ash', config: CONFIG, budgets: { ash: 100, brock: 300 },
    }));
    renderPage();
    await userEvent.click(await screen.findByRole('button', { name: 'Abra, 30 monedas' }));
    expect(screen.getByText(/te quedarán 70 monedas/)).toBeInTheDocument();
  });

  it('sin dinero para ningún Pokémon libre tu draft ha terminado', async () => {
    vi.mocked(pokemonsApi.getClosedList).mockResolvedValue([entry('e1', 'mew', 'S')]);
    vi.mocked(pokemonsApi.getDraftStatus).mockResolvedValue(draft({
      status: 'IN_PROGRESS', currentTurn: 'brock', config: CONFIG, budgets: { ash: 20, brock: 300 },
    }));
    renderPage();
    expect(await screen.findByText('Tu draft ha terminado: no te llega para ningún Pokémon libre')).toBeInTheDocument();
  });
```

(Importar `userEvent`. El test existente del tablero sin `config` no cambia: Review Focus 4.)

- [ ] **Step 2: Ejecutar y ver que falla.**

- [ ] **Step 3: Implementar**

En `DraftPage.tsx`:

1. Derivados, tras `availablePool`:

```tsx
  const config = draft?.config ?? null;
  const myRemaining = remainingBudget(draft, username);
  const priceOf = (entry: ClosedListEntry) => draftPrice(config, entry.tier);
  const myTeamSize = draft?.picks.filter((p) => p.username === username).length ?? 0;
  // Misma regla que DraftTurnService.canPick; el backend es quien valida.
  const iAmOut = draftInProgress && myRemaining !== null
    && (myTeamSize >= totalRounds || !availablePool.some((e) => canAfford(priceOf(e), myRemaining)));
  const spending = config ? spendingByPlayer(history, tierByName) : null;
```

(`draftInProgress` ya existe; mover estas líneas debajo de su declaración.)

2. `buildDraftBoard({... , snake: !!config?.snake })` y `<DraftBoard … budgets={draft.budgets} spending={spending} />`.

3. SSE: en preparación también cambian los tiers, así que el refresco invalida el pool mientras el draft está en `PENDING`:

```tsx
  const statusRef = useRef<string | undefined>(undefined);
  statusRef.current = draft?.status;
  // dentro del useEffect del SSE:
    const refresh = () => {
      queryClient.invalidateQueries({ queryKey: ['draft-status', leagueId] });
      if (statusRef.current === 'PENDING') queryClient.invalidateQueries({ queryKey: ['closed-list', leagueId] });
    };
```

(importar `useRef`; el `useEffect` no añade dependencias nuevas.)

4. Toast del sobrante: cuando el draft pasa de `IN_PROGRESS` a `COMPLETED` con la página abierta:

```tsx
  const prevStatus = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (prevStatus.current === 'IN_PROGRESS' && draft?.status === 'COMPLETED' && myRemaining && myRemaining > 0) {
      addToast('success', `Te sobraron ${coinsLabel(myRemaining)} del draft: pasan a tu saldo`);
      queryClient.invalidateQueries({ queryKey: ['my-coins', leagueId] });
    }
    prevStatus.current = draft?.status;
  }, [draft?.status, myRemaining, addToast, queryClient, leagueId]);
```

5. Barra de estado: tras "Picks del draft", si `myRemaining !== null`:

```tsx
            {myRemaining !== null && (
              <div>
                <div className="draft-stat-label">Te quedan</div>
                <div className="draft-stat-value">{myRemaining} 🪙</div>
              </div>
            )}
```

y `statusLabel` para `PENDING` pasa a `'En preparación'`.

6. Vista en preparación, después de la barra de estado:

```tsx
        {draft?.status === 'PENDING' && (
          <>
            {isAdmin ? (
              <Link className="btn-primary" to={`/leagues/${leagueId}/draft/setup`}>Continuar la preparación</Link>
            ) : (
              <Notice variant="info">El admin está preparando el draft</Notice>
            )}
            {config && (
              <>
                <p className="section-label">
                  Presupuesto: {coinsLabel(config.budget)}{config.snake ? ' · snake' : ''}
                </p>
                <SetupTierBoard pool={pool} config={config} readOnly />
              </>
            )}
          </>
        )}
```

7. Bloque `IN_PROGRESS`: si `iAmOut`, en lugar del banner/rejilla o del "Esperando…":

```tsx
        {draft?.status === 'IN_PROGRESS' && iAmOut && (
          <Notice variant="info">
            {myTeamSize >= totalRounds
              ? 'Tu draft ha terminado: tienes el equipo completo'
              : 'Tu draft ha terminado: no te llega para ningún Pokémon libre'}
          </Notice>
        )}
```

y el bloque existente pasa a `draft?.status === 'IN_PROGRESS' && !iAmOut && (…)`.

8. Cards del turno: cambiar el `div` por un botón accesible con precio:

```tsx
                {filtered.map((entry) => {
                  const price = priceOf(entry);
                  const affordable = canAfford(price, myRemaining);
                  const name = entry.pokemonName.charAt(0).toUpperCase() + entry.pokemonName.slice(1);
                  const label = config
                    ? `${name}, ${coinsLabel(price)}${affordable ? '' : ', no te llega'}`
                    : name;
                  return (
                    <div key={entry.id} className={`pokemon-card${affordable ? '' : ' unaffordable'}`}>
                      <button
                        type="button" className="pokemon-card-main" aria-label={label}
                        aria-disabled={!affordable || picking}
                        onClick={() => { if (affordable && !picking) setPendingPick(entry); }}
                      >
                        <img src={spriteUrl(entry.pokemonId)} alt="" className="pokemon-sprite" />
                        <span className="pokemon-name">{entry.pokemonName}</span>
                        <TierBadge tier={entry.tier} />
                        {config && <span className="pokemon-price">{affordable ? `${price} 🪙` : 'No te llega'}</span>}
                      </button>
                      <button
                        className="pokemon-info-btn" onClick={() => setDetailEntry(entry)}
                        title="Ver detalles" aria-label={`Ficha de ${name}`}
                      >
                        i
                      </button>
                    </div>
                  );
                })}
```

(Si `PoolCard` ya define `.pokemon-card-main` con los estilos de botón, reutilizarlo; si no, añadir en `index.css`: `.pokemon-card-main { all: unset; display: flex; flex-direction: column; align-items: center; gap: 0.25rem; cursor: pointer; width: 100%; } .pokemon-card-main:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; } .pokemon-card.unaffordable .pokemon-sprite { filter: grayscale(1); opacity: 0.5; } .pokemon-card.unaffordable .pokemon-card-main { cursor: not-allowed; } .pokemon-price { font-size: 0.75rem; color: var(--text-2); }`.)

9. Modal de confirmación: si hay `config`,

```tsx
              Vas a elegir a <strong>{pendingPick.pokemonName}</strong>
              {config && myRemaining !== null && (
                <> por {coinsLabel(priceOf(pendingPick))}: te quedarán {coinsLabel(myRemaining - priceOf(pendingPick))}</>
              )}. Esta acción no se puede deshacer.
```

10. El texto "No hay draft activo… El admin debe iniciarlo desde el panel." pasa a "El admin debe prepararlo desde Miembros."

Imports nuevos: `Notice` ya está; `SetupTierBoard`, `draftPrice`, `remainingBudget`, `canAfford`, `spendingByPlayer`, `coinsLabel`, `useRef`.

- [ ] **Step 4: Ejecutar** — `npx vitest run src/pages/DraftPage.test.tsx` → PASS; `npm test` completo en verde.

- [ ] **Step 5: Commit** — `feat(draft): precios, presupuesto y vista de preparación en el draft`

---

### Task 9: Verificación, PR y documentación

- [ ] **Step 1: Lo mismo que la CI** — `npm run lint`, `npm run api:check`, `npm test`, `npm run build`. Todo en verde.

- [ ] **Step 2: Prueba de punta a punta** con el backend de la rama en local (`VITE_API_URL=http://localhost:8080` en `.env.local`, Mongo y Redis con `docker-compose`): nominar en una liga de prueba → Preparar draft → mover dos Pokémon de tier → cambiar presupuesto y activar snake → Guardar → Empezar → hacer picks con dos usuarios hasta que uno se quede sin dinero (debe saltársele) → al terminar, comprobar el toast del sobrante, el `CoinBadge` y el evento en el perfil. Capturas a 375 px y en escritorio.

- [ ] **Step 3: PR** — revisar PRs abiertos, `git push -u origin feature/configuracion-draft`, PR contra `main` por API. Cuerpo:

```
## Qué
Pantalla de preparación del draft (tiers, precios, presupuesto, orden, snake), vista de solo lectura para los jugadores durante la preparación, y draft con precios, presupuesto restante y gasto por jugador en el tablero.

## Dependencia
Necesita el PR del backend (endpoints draft/prepare, draft/config, draft/pool/*): mergear después.

Nota: vault/50 Features/Configuración del draft.md

🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

- [ ] **Step 4: Vault** — `Configuración del draft.md` (`prs_front`, Plan front, estado), `40 Frontend/Estructura frontend.md` (ruta `draft/setup`, `DraftSetupPage`), `20 Arquitectura/API REST.md` (endpoint ↔ página), `Tablero de draft.md` (marcar hecha la idea del resumen por jugador), `Estado del draft unificado.md` (fase `preparing`). Commit y push del vault.
