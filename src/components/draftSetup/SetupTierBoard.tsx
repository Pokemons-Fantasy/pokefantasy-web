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
              <div key={e.id} className="pokemon-card" role="img" aria-label={label}>{content}</div>
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
