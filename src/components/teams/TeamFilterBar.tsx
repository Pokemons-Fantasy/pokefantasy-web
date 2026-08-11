import type { Tier } from '../../api/pokemons';

const TIERS: Tier[] = ['S', 'A', 'B', 'C', 'D'];

interface TeamFilterBarProps {
  filterName: string;
  onFilterNameChange: (value: string) => void;
  filterTiers: Set<Tier>;
  onToggleTier: (tier: Tier) => void;
  onClear: () => void;
  filterActive: boolean;
  filteredTeamCount: number;
  filteredPokemonCount: number;
}

export default function TeamFilterBar({
  filterName, onFilterNameChange, filterTiers, onToggleTier, onClear,
  filterActive, filteredTeamCount, filteredPokemonCount,
}: TeamFilterBarProps) {
  return (
    <div style={{ marginBottom: '1rem' }}>
      <input
        className="search-input"
        type="text"
        placeholder="Buscar pokémon en equipos rivales..."
        value={filterName}
        onChange={(e) => onFilterNameChange(e.target.value)}
        style={{ marginBottom: '0.5rem' }}
      />
      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginRight: '0.1rem' }}>
          Tier:
        </span>
        {TIERS.map((tier) => (
          <button
            key={tier}
            className={`gen-tab${filterTiers.has(tier) ? ' active' : ''}`}
            onClick={() => onToggleTier(tier)}
          >
            {tier}
          </button>
        ))}
        {filterActive && (
          <button
            className="gen-tab"
            style={{ color: 'var(--red)', borderColor: 'rgba(248,113,113,0.3)' }}
            onClick={onClear}
          >
            ✕ Limpiar
          </button>
        )}
      </div>
      {filterActive && (
        <p style={{ fontSize: '0.8rem', color: 'var(--text-3)', marginTop: '0.45rem' }}>
          {filteredTeamCount}{' '}
          {filteredTeamCount === 1 ? 'rival' : 'rivales'} ·{' '}
          {filteredPokemonCount} pokémon
        </p>
      )}
    </div>
  );
}
