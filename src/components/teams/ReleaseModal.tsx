import type { DraftPick, Tier } from '../../api/pokemons';
import TierBadge from '../TierBadge';
import { spriteUrl } from '../../utils/sprites';

interface ReleaseModalProps {
  pick: DraftPick;
  rewardCoins: number;
  currentCoins: number;
  tierByName: Map<string, Tier | null | undefined>;
  releasing: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export default function ReleaseModal({
  pick, rewardCoins, currentCoins, tierByName, releasing, onConfirm, onClose,
}: ReleaseModalProps) {
  const tier = tierByName.get(pick.pokemonName);

  return (
    <div
      className="modal-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal animate-in-fast" style={{ maxWidth: 400 }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '1.15rem' }}>Liberar pokémon</h2>
          <button
            className="btn-ghost"
            style={{ padding: '0.2rem 0.55rem', fontSize: '1rem', lineHeight: 1 }}
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        {/* Pokemon info */}
        <div style={{
          background: 'var(--surface-2)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          padding: '1rem 1.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1.25rem',
        }}>
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <img
              src={spriteUrl(pick.pokemonId)}
              alt={pick.pokemonName}
              style={{ width: 72, height: 72, imageRendering: 'pixelated', display: 'block' }}
            />
            <TierBadge tier={tier} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: '1.05rem', textTransform: 'capitalize', marginBottom: '0.3rem' }}>
              {pick.pokemonName}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-3)' }}>
              Volverá a la banca disponible para todos
            </div>
          </div>
        </div>

        {/* Reward summary */}
        <div style={{
          background: 'rgba(52,211,153,0.05)',
          border: '1px solid rgba(52,211,153,0.18)',
          borderRadius: 10,
          padding: '0.75rem 1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.4rem',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-2)' }}>Recibirás</span>
            <span className="coin-badge" style={{ background: 'rgba(52,211,153,0.12)' }}>
              💰 +{rewardCoins}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-3)' }}>Tu saldo</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-2)' }}>
              {currentCoins} → <strong>{currentCoins + rewardCoins}</strong>
            </span>
          </div>
        </div>

        <div className="modal-actions">
          <button className="btn-ghost" onClick={onClose} disabled={releasing}>
            Cancelar
          </button>
          <button
            className="btn-primary"
            disabled={releasing}
            onClick={onConfirm}
            style={{ background: 'rgba(239,68,68,0.85)' }}
          >
            {releasing ? 'Liberando…' : `Liberar → 💰 +${rewardCoins}`}
          </button>
        </div>

      </div>
    </div>
  );
}
