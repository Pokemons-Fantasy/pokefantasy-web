import type { Lineup, MatchDto } from '../../api/leagues';
import { spriteUrl } from '../../utils/sprites';
import { isHttpsUrl } from '../../utils/lineup';

interface MatchLineupsProps {
  match: MatchDto;
  username: string | null;
  /** Nombre del Pokémon → id de PokeAPI, para el sprite (de los picks del draft). */
  spriteIds: Map<string, number>;
}

/**
 * Las alineaciones que el usuario puede ver: las dos cuando están reveladas; antes, solo la suya (el
 * backend ya no manda la del rival).
 */
export default function MatchLineups({ match, username, spriteIds }: MatchLineupsProps) {
  const shown: [string, Lineup][] = [];
  if (match.player1Lineup) shown.push([match.player1, match.player1Lineup]);
  if (match.player2Lineup) shown.push([match.player2, match.player2Lineup]);
  // Sin revelar, el backend solo manda la mía; aun así no se enseña nada ajeno.
  const revealed = !!match.player1LineupSubmitted && !!match.player2LineupSubmitted;
  const visible = revealed ? shown : shown.filter(([player]) => player === username);
  if (visible.length === 0) return null;

  return (
    <div className="match-lineups">
      {visible.map(([player, lineup]) => (
        <section key={player} className="match-lineup" aria-label={`Alineación de ${player}`}>
          <span className="match-lineup-owner">{player}</span>
          <div className="match-lineup-sprites">
            {lineup.pokemonNames.map((name) => {
              const id = spriteIds.get(name);
              return id != null
                ? <img key={name} src={spriteUrl(id)} alt={name} title={name} width={40} height={40} loading="lazy" />
                : <span key={name} className="match-lineup-name">{name}</span>;
            })}
          </div>
          {isHttpsUrl(lineup.pasteUrl) && (
            <a href={lineup.pasteUrl!} target="_blank" rel="noopener noreferrer" className="match-lineup-link">
              Ver equipo
            </a>
          )}
          {!!lineup.pasteWarnings?.length && (
            <ul className="match-lineup-warnings">
              {lineup.pasteWarnings.map((w) => <li key={w}>{w}</li>)}
            </ul>
          )}
        </section>
      ))}
    </div>
  );
}
