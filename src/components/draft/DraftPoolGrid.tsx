import { useState } from 'react';
import type { ClosedListEntry, DraftConfig } from '../../api/pokemons';
import TierBadge from '../TierBadge';
import FilterRow from '../pool/FilterRow';
import { spriteUrl } from '../../utils/sprites';
import { coinsLabel } from '../../utils/coins';
import { canAfford, draftPrice } from '../../utils/draftBudget';
import { arrangeDraftPool, tierCounts, type DraftPoolFilters, type DraftPoolSort } from '../../utils/draftPool';

interface DraftPoolGridProps {
  /** Pokémon que quedan por elegir. */
  entries: ClosedListEntry[];
  config: DraftConfig | null;
  /** Monedas que te quedan; null si el draft no tiene presupuesto. */
  remaining: number | null;
  /** Es tu turno: las tarjetas eligen. Si no, solo se consulta (la ficha se abre igual). */
  canPick: boolean;
  picking: boolean;
  favorites: Set<string>;
  onToggleFavorite: (pokemonName: string) => void;
  onPick: (entry: ClosedListEntry) => void;
  onInfo: (entry: ClosedListEntry) => void;
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Pool del draft: visible todo el draft para ir mirando; en tu turno, además, para elegir. */
export default function DraftPoolGrid({
  entries, config, remaining, canPick, picking, favorites, onToggleFavorite, onPick, onInfo,
}: DraftPoolGridProps) {
  const [filters, setFilters] = useState<DraftPoolFilters>({ search: '', tier: 'all', sort: 'tier', onlyAffordable: false });
  const set = (patch: Partial<DraftPoolFilters>) => setFilters((f) => ({ ...f, ...patch }));
  const shown = arrangeDraftPool(entries, filters, { config, remaining, favorites });
  const sorts: { key: DraftPoolSort; label: string }[] = [
    { key: 'tier', label: 'Tier' },
    ...(config ? [{ key: 'price' as const, label: 'Precio' }] : []),
    { key: 'name', label: 'Nombre' },
  ];

  return (
    <div className="draft-pool">
      <input
        className="search-input"
        type="search"
        placeholder="Buscar en el pool..."
        aria-label="Buscar en el pool"
        value={filters.search}
        onChange={(e) => set({ search: e.target.value })}
      />

      <FilterRow label="Tier">
        <button type="button" className={`gen-tab${filters.tier === 'all' ? ' active' : ''}`}
          aria-pressed={filters.tier === 'all'} onClick={() => set({ tier: 'all' })}>
          Todos ({entries.length})
        </button>
        {tierCounts(entries).map(({ tier, count }) => (
          <button key={tier} type="button" className={`gen-tab${filters.tier === tier ? ' active' : ''}`}
            aria-pressed={filters.tier === tier} onClick={() => set({ tier })}>
            {tier} ({count})
          </button>
        ))}
      </FilterRow>

      <FilterRow label="Ordenar y filtrar">
        <span className="draft-pool-label" aria-hidden="true">Ordenar:</span>
        {sorts.map(({ key, label }) => (
          <button key={key} type="button" className={`gen-tab${filters.sort === key ? ' active' : ''}`}
            aria-pressed={filters.sort === key} onClick={() => set({ sort: key })}>
            {label}
          </button>
        ))}
        {config && (
          <button type="button" className={`gen-tab${filters.onlyAffordable ? ' active' : ''}`}
            aria-pressed={filters.onlyAffordable} onClick={() => set({ onlyAffordable: !filters.onlyAffordable })}>
            Solo los que me llegan
          </button>
        )}
      </FilterRow>

      {shown.length === 0 ? (
        <p className="empty-state">Ningún Pokémon del pool coincide con los filtros.</p>
      ) : (
        <div className="pokemon-grid">
          {shown.map((entry) => {
            const price = draftPrice(config, entry.tier);
            const affordable = canAfford(price, remaining);
            const name = capitalize(entry.pokemonName);
            const favorite = favorites.has(entry.pokemonName);
            const label = config ? `${name}, ${coinsLabel(price)}${affordable ? '' : ', no te llega'}` : name;
            const selectable = canPick && affordable && !picking;
            return (
              <div key={entry.id}
                className={`pokemon-card${picking ? ' nominated' : ''}${affordable ? '' : ' unaffordable'}${canPick ? '' : ' browse'}${favorite ? ' favorite' : ''}`}>
                <button
                  type="button"
                  className="pokemon-card-main"
                  aria-label={label}
                  aria-disabled={!selectable}
                  title={canPick ? undefined : 'Podrás elegirlo cuando sea tu turno'}
                  onClick={() => { if (selectable) onPick(entry); }}
                >
                  <img src={spriteUrl(entry.pokemonId)} alt="" className="pokemon-sprite" />
                  <span className="pokemon-name">{entry.pokemonName}</span>
                  <TierBadge tier={entry.tier} />
                  {config && <span className="pokemon-price">{affordable ? `${price} 🪙` : 'No te llega'}</span>}
                </button>
                <button
                  type="button"
                  className="pokemon-info-btn"
                  onClick={() => onInfo(entry)}
                  title="Ver detalles"
                  aria-label={`Ficha de ${name}`}
                >
                  i
                </button>
                <button
                  type="button"
                  className={`pokemon-fav-btn${favorite ? ' on' : ''}`}
                  aria-pressed={favorite}
                  aria-label={favorite ? `Quitar ${name} de favoritos` : `Marcar ${name} como favorito`}
                  title={favorite ? 'Quitar de favoritos' : 'Marcar como favorito'}
                  onClick={() => onToggleFavorite(entry.pokemonName)}
                >
                  {favorite ? '★' : '☆'}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
