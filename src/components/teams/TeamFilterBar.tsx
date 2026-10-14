import type { Tier } from '../../api/pokemons';
import TierFilterChips from './TierFilterChips';

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
        placeholder="Buscar Pokémon en equipos rivales..."
        value={filterName}
        onChange={(e) => onFilterNameChange(e.target.value)}
        style={{ marginBottom: '0.5rem' }}
      />
      <TierFilterChips selected={filterTiers} onToggle={onToggleTier} onClear={filterActive ? onClear : undefined} />
      {filterActive && (
        <p style={{ fontSize: '0.8rem', color: 'var(--text-3)', marginTop: '0.45rem' }}>
          {filteredTeamCount}{' '}
          {filteredTeamCount === 1 ? 'rival' : 'rivales'} ·{' '}
          {filteredPokemonCount} Pokémon
        </p>
      )}
    </div>
  );
}
