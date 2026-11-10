import type { DraftPick, Tier } from '../../api/pokemons';
import type { Team } from '../../utils/teams';
import { isPickLocked } from '../../utils/teams';
import PokemonCard from './PokemonCard';

export interface OwnTeamGridProps {
  team: Team;
  tierByName: Map<string, Tier | null | undefined>;
  isDraftCompleted: boolean;
  stealWindowOpen: boolean;
  swapWindowClosed: boolean;
  effectiveStealPrice: (pick: DraftPick) => number;
  onRaisePrice: (pick: DraftPick) => void;
  onRelease: (pick: DraftPick) => void;
  onInfo: (pick: DraftPick) => void;
}

/** Rejilla con tus Pokémon y sus acciones (subir precio, liberar). La usan el panel de escritorio y la vista móvil. */
export default function OwnTeamGrid({
  team, tierByName, isDraftCompleted, stealWindowOpen, swapWindowClosed, effectiveStealPrice, onRaisePrice, onRelease, onInfo,
}: OwnTeamGridProps) {
  if (team.picks.length === 0) {
    return <p style={{ color: 'var(--text-3)', fontSize: '0.875rem' }}>Sin picks aún</p>;
  }
  return (
    <div className="pokemon-grid">
      {team.picks.map((pick) => (
        <PokemonCard
          key={pick.pokemonName}
          pick={pick}
          tier={tierByName.get(pick.pokemonName)}
          isMine
          locked={isPickLocked(pick)}
          isDraftCompleted={isDraftCompleted}
          stealWindowOpen={stealWindowOpen}
          stealPrice={effectiveStealPrice(pick)}
          canAffordSteal={false}
          onInfo={() => onInfo(pick)}
          onRaisePrice={() => onRaisePrice(pick)}
          onRelease={!swapWindowClosed && !isPickLocked(pick) ? () => onRelease(pick) : undefined}
        />
      ))}
    </div>
  );
}
