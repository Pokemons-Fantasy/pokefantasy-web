import type { DraftPick, Tier } from '../../api/pokemons';
import type { Team } from '../../utils/teams';
import { isPickLocked } from '../../utils/teams';
import PokemonCard from './PokemonCard';

interface RivalTeamsListProps {
  teams: Team[];
  maxTeamSize: number;
  isDraftCompleted: boolean;
  copiedTeam: string | null;
  onExportShowdown: (team: Team) => void;
  tierByName: Map<string, Tier | null | undefined>;
  stealWindowOpen: boolean;
  effectiveStealPrice: (pick: DraftPick) => number;
  myBalance: number;
  onInfo: (pick: DraftPick) => void;
  onSteal: (pick: DraftPick, responder: string) => void;
  onProposeTrade: (pick: DraftPick, responder: string) => void;
}

export default function RivalTeamsList({
  teams, maxTeamSize, isDraftCompleted, copiedTeam, onExportShowdown,
  tierByName, stealWindowOpen, effectiveStealPrice, myBalance, onInfo, onSteal, onProposeTrade,
}: RivalTeamsListProps) {
  return (
    <>
      {teams.map((team) => (
        <div key={team.username}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <div className="member-avatar">{team.username[0]}</div>
            <span style={{ fontWeight: 600, fontSize: '1rem' }}>{team.username}</span>
            <span style={{ color: 'var(--text-3)', fontSize: '0.85rem' }}>
              {team.picks.length}/{maxTeamSize}
            </span>
            {isDraftCompleted && team.picks.length > 0 && (
              <button
                className="btn-ghost"
                style={{ fontSize: '0.78rem', padding: '0.2rem 0.55rem', marginLeft: 'auto' }}
                onClick={() => onExportShowdown(team)}
                title="Copiar equipo en formato Pokémon Showdown"
              >
                {copiedTeam === team.username ? '✓ Copiado' : '📋 Showdown'}
              </button>
            )}
          </div>
          {team.picks.length === 0 ? (
            <p style={{ color: 'var(--text-3)', fontSize: '0.875rem' }}>Sin picks aún</p>
          ) : (
            <div className="pokemon-grid">
              {team.picks.map((pick) => {
                const locked = isPickLocked(pick);
                const stealPrice = effectiveStealPrice(pick);
                const isTradeable = isDraftCompleted && !locked;
                return (
                  <PokemonCard
                    key={pick.pokemonName}
                    pick={pick}
                    tier={tierByName.get(pick.pokemonName)}
                    isMine={false}
                    locked={locked}
                    isDraftCompleted={isDraftCompleted}
                    stealWindowOpen={stealWindowOpen}
                    stealPrice={stealPrice}
                    canAffordSteal={myBalance >= stealPrice}
                    onInfo={() => onInfo(pick)}
                    onCardClick={() => {
                      if (stealWindowOpen && !locked) {
                        onSteal(pick, team.username);
                      } else if (isTradeable) {
                        onProposeTrade(pick, team.username);
                      }
                    }}
                  />
                );
              })}
            </div>
          )}
        </div>
      ))}
    </>
  );
}
