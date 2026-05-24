import type { DraftPick, Tier } from '../../api/pokemons';
import TierBadge from '../TierBadge';
import { spriteUrl } from '../../utils/sprites';

interface StealModalProps {
  pick: DraftPick;
  stealPrice: number;
  myBalance: number;
  tierByName: Map<string, Tier | null | undefined>;
  stealing: boolean;
  error: string;
  onConfirm: () => void;
  onClose: () => void;
  onBack?: () => void;
}

export default function StealModal({
  pick, stealPrice, myBalance, tierByName, stealing, error, onConfirm, onClose, onBack,
}: StealModalProps) {
  const tier = tierByName.get(pick.pokemonName);
  const canAfford = myBalance >= stealPrice;

  return (
    <div
      className="modal-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal animate-in-fast" style={{ maxWidth: 440 }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '1.15rem' }}>Robar pokémon</h2>
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
            <div style={{ fontSize: '0.8rem', color: 'var(--text-3)', marginBottom: '0.5rem' }}>
              De: <strong>{pick.username}</strong>
            </div>
            <span className="coin-badge coin-badge-lg">💰 {stealPrice}</span>
          </div>
        </div>

        {/* Balance + rival gets */}
        <div style={{
          background: canAfford ? 'rgba(52,211,153,0.05)' : 'rgba(248,113,113,0.05)',
          border: `1px solid ${canAfford ? 'rgba(52,211,153,0.18)' : 'rgba(248,113,113,0.18)'}`,
          borderRadius: 10,
          padding: '0.75rem 1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.4rem',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-2)' }}>Tu saldo</span>
            <span className="coin-badge" style={!canAfford ? {
              background: 'rgba(107,114,128,0.15)',
              borderColor: 'rgba(107,114,128,0.25)',
              color: '#9ca3af',
            } : {}}>
              💰 {myBalance}
            </span>
          </div>
          {canAfford && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-3)' }}>
                ⚠️ {pick.username} recibirá
              </span>
              <span className="coin-badge" style={{ background: 'rgba(251,191,36,0.08)' }}>
                💰 {stealPrice * 2}
              </span>
            </div>
          )}
          {!canAfford && (
            <span style={{ fontSize: '0.8rem', color: 'var(--red)', fontWeight: 600 }}>
              Te faltan {stealPrice - myBalance} monedas
            </span>
          )}
        </div>

        {error && <p className="error">{error}</p>}

        <div className="modal-actions">
          {onBack ? (
            <button className="btn-ghost" onClick={onBack} disabled={stealing}>
              ← Volver
            </button>
          ) : (
            <button className="btn-ghost" onClick={onClose} disabled={stealing}>
              Cancelar
            </button>
          )}
          <button
            className="btn-primary"
            disabled={!canAfford || stealing}
            onClick={onConfirm}
            style={canAfford ? { background: 'rgba(239,68,68,0.85)' } : undefined}
          >
            {stealing ? 'Robando…' : `Robar → 💰 ${stealPrice}`}
          </button>
        </div>

      </div>
    </div>
  );
}
