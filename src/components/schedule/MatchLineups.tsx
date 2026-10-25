import type { ReactNode } from 'react';
import type { Lineup, MatchDto } from '../../api/leagues';
import { spriteUrl } from '../../utils/sprites';
import { isHttpsUrl } from '../../utils/lineup';

interface MatchLineupsProps {
  match: MatchDto;
  username: string | null;
  /** Nombre del Pokémon → id de PokeAPI, para el sprite (de los picks del draft). */
  spriteIds: Map<string, number>;
  /** Texto de estado de la alineación ("Esperando la alineación de…"), en el centro. */
  status?: ReactNode;
}

const SILHOUETTES = 6;

/**
 * Segundo piso de la fila del partido: la alineación de cada jugador bajo su nombre (player1 a la izquierda,
 * player2 a la derecha) y el estado en el centro. Reveladas, las dos con sprites; antes, la mía y, en el lado
 * que no veo, siluetas con si ya la han enviado (el backend no manda la del rival).
 */
export default function MatchLineups({ match, username, spriteIds, status }: MatchLineupsProps) {
  const p1Sent = !!match.player1LineupSubmitted;
  const p2Sent = !!match.player2LineupSubmitted;
  const revealed = p1Sent && p2Sent;
  const player = username === match.player1 || username === match.player2;
  // A ciegas: soy jugador, el partido sigue y ya se puede declarar o alguien la ha enviado.
  const blind = !revealed && player && match.status === 'PENDING' && (!!match.lineupOpen || p1Sent || p2Sent);
  const visible = (owner: string, lineup?: Lineup | null) =>
    lineup && (revealed || owner === username) ? lineup : null;
  const left = visible(match.player1, match.player1Lineup);
  const right = visible(match.player2, match.player2Lineup);

  if (!left && !right && !blind && !status) return null;

  function side(owner: string, lineup: Lineup | null, sent: boolean, position: 'left' | 'right') {
    if (lineup) {
      return (
        <section className={`match-lineup ${position}`} aria-label={`Alineación de ${owner}`}>
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
      );
    }
    if (!blind) return <div className={`match-lineup ${position}`} />;
    return (
      <section className={`match-lineup ${position}`} aria-label={`Alineación de ${owner}`}>
        <div className="match-lineup-sprites" aria-hidden="true">
          {Array.from({ length: SILHOUETTES }, (_, i) => <span key={i} className="lineup-silhouette" />)}
        </div>
        <span className={`match-lineup-state${sent ? ' sent' : ''}`}>{sent ? 'Enviada ✓' : 'Pendiente'}</span>
      </section>
    );
  }

  return (
    <div className="match-extra">
      {side(match.player1, left, p1Sent, 'left')}
      <div className="match-lineup-status">{status}</div>
      {side(match.player2, right, p2Sent, 'right')}
    </div>
  );
}
