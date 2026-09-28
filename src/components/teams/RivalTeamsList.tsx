import { useId, useState } from 'react';
import type { DraftPick, Tier } from '../../api/pokemons';
import type { Team } from '../../utils/teams';
import { isPickLocked } from '../../utils/teams';
import { TIER_ORDER } from '../../utils/tiers';
import PokemonCard from './PokemonCard';
import UserAvatar from '../avatar/UserAvatar';

interface RivalTeamsListProps {
  teams: Team[];
  /** Con un filtro activo se muestran desplegados los equipos que coinciden. */
  filterActive: boolean;
  maxTeamSize: number;
  isDraftCompleted: boolean;
  copiedTeam: string | null;
  onExportShowdown: (team: Team) => void;
  tierByName: Map<string, Tier | null | undefined>;
  stealWindowOpen: boolean;
  swapWindowOpen: boolean;
  effectiveStealPrice: (pick: DraftPick) => number;
  myBalance: number;
  onInfo: (pick: DraftPick) => void;
  onSteal: (pick: DraftPick, responder: string) => void;
  onProposeTrade: (pick: DraftPick, responder: string) => void;
}

function tierCounts(picks: DraftPick[], tierByName: Map<string, Tier | null | undefined>) {
  return TIER_ORDER
    .map((tier) => ({ tier, count: picks.filter((p) => tierByName.get(p.pokemonName) === tier).length }))
    .filter((t) => t.count > 0);
}

export default function RivalTeamsList({
  teams, filterActive, maxTeamSize, isDraftCompleted, copiedTeam, onExportShowdown,
  tierByName, stealWindowOpen, swapWindowOpen, effectiveStealPrice, myBalance, onInfo, onSteal, onProposeTrade,
}: RivalTeamsListProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const idPrefix = useId();
  const allExpanded = teams.length > 0 && teams.every((t) => expanded.has(t.username));

  const toggle = (username: string) => setExpanded((prev) => {
    const next = new Set(prev);
    if (next.has(username)) next.delete(username);
    else next.add(username);
    return next;
  });

  return (
    <div className="rival-teams">
      {!filterActive && teams.length > 1 && (
        <button
          type="button"
          className="btn-ghost rival-toggle-all"
          onClick={() => setExpanded(allExpanded ? new Set() : new Set(teams.map((t) => t.username)))}
        >
          {allExpanded ? 'Plegar todos' : 'Desplegar todos'}
        </button>
      )}

      {teams.map((team) => {
        const open = filterActive || expanded.has(team.username);
        const panelId = `${idPrefix}-${team.username}`;
        const counts = tierCounts(team.picks, tierByName);
        return (
          <section key={team.username} className="rival-team">
            <div className="rival-team-header">
              <button
                type="button"
                className="rival-team-toggle"
                aria-expanded={open}
                aria-controls={panelId}
                onClick={() => toggle(team.username)}
              >
                <span className={`rival-team-chevron${open ? ' open' : ''}`} aria-hidden="true">▸</span>
                <UserAvatar username={team.username} />
                <span className="rival-team-name">{team.username}</span>
                <span className="rival-team-size">{team.picks.length}/{maxTeamSize}</span>
                {counts.length > 0 && (
                  <span
                    className="rival-team-tiers"
                    aria-label={`Por tier: ${counts.map((c) => `${c.count} ${c.tier}`).join(', ')}`}
                  >
                    {counts.map((c) => (
                      <span key={c.tier} className={`tier-count tier-count-${c.tier.toLowerCase()}`} aria-hidden="true">
                        {c.tier}{c.count}
                      </span>
                    ))}
                  </span>
                )}
              </button>
              {isDraftCompleted && team.picks.length > 0 && (
                <button
                  className="btn-ghost"
                  style={{ fontSize: '0.78rem', padding: '0.2rem 0.55rem' }}
                  onClick={() => onExportShowdown(team)}
                  title="Copiar equipo en formato Pokémon Showdown"
                >
                  {copiedTeam === team.username ? '✓ Copiado' : '📋 Showdown'}
                </button>
              )}
            </div>

            {open && (
              <div id={panelId}>
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
                          swapWindowOpen={swapWindowOpen}
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
            )}
          </section>
        );
      })}
    </div>
  );
}
