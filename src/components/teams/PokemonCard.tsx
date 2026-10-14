import type { DraftPick, Tier } from '../../api/pokemons';
import TierBadge from '../TierBadge';
import { spriteUrl } from '../../utils/sprites';
import LockChip from './LockChip';

interface PokemonCardProps {
  pick: DraftPick;
  tier: Tier | null | undefined;
  isMine: boolean;
  locked: boolean;
  /** Para el tiempo de bloqueo restante; lo refresca la página. */
  now: Date;
  isDraftCompleted: boolean;
  stealWindowOpen: boolean;
  /** Rival: con el mercado cerrado un trade se puede proponer, pero solo se acepta cuando abra. */
  swapWindowOpen?: boolean;
  stealPrice: number;
  canAffordSteal: boolean;
  onInfo: () => void;
  /** Rival únicamente: click en la tarjeta para robar o proponer trade (decide el caller). */
  onCardClick?: () => void;
  /** Propietario únicamente: botón "⬆ precio". Solo se renderiza si se pasa. */
  onRaisePrice?: () => void;
  /** Propietario únicamente: botón "🔓 liberar". Solo se renderiza si se pasa. */
  onRelease?: () => void;
}

export default function PokemonCard({
  pick, tier, isMine, locked, now, isDraftCompleted, stealWindowOpen, swapWindowOpen, stealPrice, canAffordSteal,
  onInfo, onCardClick, onRaisePrice, onRelease,
}: PokemonCardProps) {
  if (isMine) {
    return (
      <div className="pokemon-card" style={{ cursor: 'default', position: 'relative' }}>
        <img src={spriteUrl(pick.pokemonId)} alt={pick.pokemonName} className="pokemon-sprite" loading="lazy" />
        <span className="pokemon-name">{pick.pokemonName}</span>
        <TierBadge tier={tier} />
        {locked && <LockChip lockedUntil={pick.lockedUntil} now={now} />}
        {stealWindowOpen && (
          <>
            <span className="coin-badge" style={{
              marginTop: '0.25rem',
              fontSize: '0.68rem',
              background: 'var(--accent-dim)',
              borderColor: 'var(--accent-glow)',
            }}>
              🛡 {stealPrice}
            </span>
            {onRaisePrice && (
              <button
                onClick={onRaisePrice}
                title="Subir precio de robo"
                aria-label="Subir precio de robo"
                style={{
                  marginTop: '0.2rem',
                  padding: '0.15rem 0.4rem',
                  fontSize: '0.65rem',
                  background: 'rgba(99,102,241,0.15)',
                  border: '1px solid rgba(99,102,241,0.3)',
                  borderRadius: 4,
                  color: '#a5b4fc',
                  cursor: 'pointer',
                }}
              >
                ⬆ precio
              </button>
            )}
          </>
        )}
        {onRelease && (
          <button
            onClick={(e) => { e.stopPropagation(); onRelease(); }}
            title="Liberar al banquillo"
            aria-label="Liberar al banquillo"
            style={{
              marginTop: '0.2rem',
              padding: '0.15rem 0.4rem',
              fontSize: '0.65rem',
              background: 'var(--danger-bg)',
              border: '1px solid var(--danger-border)',
              borderRadius: 4,
              color: '#fca5a5',
              cursor: 'pointer',
            }}
          >
            🔓 liberar
          </button>
        )}
        <button className="pokemon-info-btn" onClick={(e) => { e.stopPropagation(); onInfo(); }} title="Ver detalles" aria-label="Ver detalles">
          i
        </button>
      </div>
    );
  }

  // Rival pokemon card
  const isTradeable = isDraftCompleted && !locked;
  const isClickable = (stealWindowOpen && !locked) || isTradeable;
  // Sin robos, la card lleva a proponer; el backend acepta la propuesta pero solo la ejecuta con el mercado abierto
  const proposeTitle = !stealWindowOpen && isTradeable && swapWindowOpen === false
    ? 'Proponer intercambio: se podrá aceptar cuando abra el mercado'
    : undefined;
  return (
    <div
      className="pokemon-card"
      style={{
        cursor: isClickable ? 'pointer' : 'default',
        opacity: stealWindowOpen && locked ? 0.5 : 1,
      }}
      title={proposeTitle}
      onClick={() => { if (isClickable) onCardClick?.(); }}
    >
      <img src={spriteUrl(pick.pokemonId)} alt={pick.pokemonName} className="pokemon-sprite" loading="lazy" />
      <span className="pokemon-name">{pick.pokemonName}</span>
      <TierBadge tier={tier} />
      {locked && <LockChip lockedUntil={pick.lockedUntil} now={now} />}
      {stealWindowOpen && !locked && (
        <>
          <span className="coin-badge" style={{
            marginTop: '0.25rem',
            fontSize: '0.68rem',
            background: canAffordSteal ? 'rgba(239,68,68,0.1)' : 'rgba(107,114,128,0.15)',
            borderColor: canAffordSteal ? 'rgba(239,68,68,0.3)' : 'rgba(107,114,128,0.25)',
            color: canAffordSteal ? 'var(--danger)' : 'var(--text-3)',
          }}>
            💰 {stealPrice}
          </span>
          {!canAffordSteal && (
            <span style={{ marginTop: '0.15rem', fontSize: '0.65rem', color: 'var(--text-3)' }}>
              ⇄ proponer
            </span>
          )}
        </>
      )}
      {!stealWindowOpen && isDraftCompleted && !locked && (
        <span style={{ marginTop: '0.25rem', fontSize: '0.65rem', color: 'var(--text-3)' }}>
          ⇄ proponer
        </span>
      )}
      <button className="pokemon-info-btn" onClick={(e) => { e.stopPropagation(); onInfo(); }} title="Ver detalles" aria-label="Ver detalles">
        i
      </button>
    </div>
  );
}
