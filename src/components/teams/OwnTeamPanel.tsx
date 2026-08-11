import type { DraftPick, Tier } from '../../api/pokemons';
import type { Team } from '../../utils/teams';
import { isPickLocked } from '../../utils/teams';
import PokemonCard from './PokemonCard';

interface OwnTeamPanelProps {
  team: Team;
  maxTeamSize: number;
  myCoins: number | undefined;
  isDraftCompleted: boolean;
  collapsed: boolean;
  onToggleCollapse: () => void;
  copied: boolean;
  onExportShowdown: () => void;
  tierByName: Map<string, Tier | null | undefined>;
  stealWindowOpen: boolean;
  swapWindowClosed: boolean;
  effectiveStealPrice: (pick: DraftPick) => number;
  onRaisePrice: (pick: DraftPick) => void;
  onRelease: (pick: DraftPick) => void;
  onInfo: (pick: DraftPick) => void;
}

export default function OwnTeamPanel({
  team, maxTeamSize, myCoins, isDraftCompleted, collapsed, onToggleCollapse, copied, onExportShowdown,
  tierByName, stealWindowOpen, swapWindowClosed, effectiveStealPrice, onRaisePrice, onRelease, onInfo,
}: OwnTeamPanelProps) {
  return (
    <div className="own-team-panel">
      <div className="own-team-panel-header">
        <div className="own-team-header-info">
          <div className="member-avatar">{team.username[0]}</div>
          <span style={{ fontWeight: 600, fontSize: '1rem' }}>Tu equipo</span>
          <span style={{ color: 'var(--text-3)', fontSize: '0.85rem' }}>
            {team.picks.length}/{maxTeamSize}
          </span>
          <span className="badge badge-green">Tú</span>
          {myCoins !== undefined && (
            <span className="coin-badge">💰 {myCoins}</span>
          )}
        </div>
        <div className="own-team-header-actions">
          {isDraftCompleted && team.picks.length > 0 && (
            <button
              className="btn-ghost"
              style={{ fontSize: '0.78rem', padding: '0.2rem 0.55rem' }}
              onClick={onExportShowdown}
              title="Copiar equipo en formato Pokémon Showdown"
            >
              {copied ? '✓ Copiado' : '📋 Showdown'}
            </button>
          )}
          <button className="btn-ghost own-team-collapse-btn" onClick={onToggleCollapse}>
            {collapsed ? '▶' : '▼'}
          </button>
        </div>
      </div>
      {!collapsed && (
        <div className="own-team-panel-grid">
          {team.picks.length === 0 ? (
            <p style={{ color: 'var(--text-3)', fontSize: '0.875rem' }}>Sin picks aún</p>
          ) : (
            <div className="pokemon-grid">
              {team.picks.map((pick) => (
                <PokemonCard
                  key={pick.pokemonName}
                  pick={pick}
                  tier={tierByName.get(pick.pokemonName)}
                  isMine
                  locked={false}
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
          )}
        </div>
      )}
    </div>
  );
}
