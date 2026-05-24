import type { DraftPick, Tier } from '../../api/pokemons';
import TierBadge from '../TierBadge';
import { spriteUrl } from '../../utils/sprites';

interface RivalActionModalProps {
  pick: DraftPick;
  responder: string;
  stealPrice: number;
  myBalance: number;
  tierByName: Map<string, Tier | null | undefined>;
  onChooseSteal: () => void;
  onChooseTrade: () => void;
  onClose: () => void;
}

export default function RivalActionModal({
  pick, responder, stealPrice, myBalance, tierByName, onChooseSteal, onChooseTrade, onClose,
}: RivalActionModalProps) {
  const tier = tierByName.get(pick.pokemonName);
  const canAffordSteal = myBalance >= stealPrice;

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal animate-in-fast" style={{ maxWidth: 480 }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '1.15rem' }}>
            Pokémon de <strong>{responder}</strong>
          </h2>
          <button
            className="btn-ghost"
            style={{ padding: '0.2rem 0.55rem', fontSize: '1rem', lineHeight: 1 }}
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        {/* Pokemon header */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '1rem',
          background: 'var(--surface-2)', border: '1px solid var(--border)',
          borderRadius: 12, padding: '1rem 1.25rem', marginTop: '1rem',
        }}>
          <img
            src={spriteUrl(pick.pokemonId)}
            alt={pick.pokemonName}
            style={{ width: 72, height: 72, imageRendering: 'pixelated' }}
          />
          <div>
            <div style={{ fontWeight: 700, fontSize: '1.05rem', textTransform: 'capitalize' }}>
              {pick.pokemonName}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
              {tier && <TierBadge tier={tier} />}
              <span className="coin-badge" style={{ fontSize: '0.75rem' }}>
                💰 {stealPrice}
              </span>
            </div>
            <div style={{ color: 'var(--text-3)', fontSize: '0.78rem', marginTop: '0.15rem' }}>
              Tu saldo: 💰 {myBalance}
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '1.25rem' }}>
          <button
            className="btn-ghost"
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              gap: '0.4rem', padding: '1rem', borderRadius: 10,
              border: '2px solid var(--border)', height: 'auto',
              opacity: canAffordSteal ? 1 : 0.5,
            }}
            onClick={() => canAffordSteal && onChooseSteal()}
            disabled={!canAffordSteal}
            title={!canAffordSteal ? `Necesitas ${stealPrice} monedas (tienes ${myBalance})` : undefined}
          >
            <span style={{ fontSize: '1.5rem' }}>🗡️</span>
            <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Robar</span>
            <span style={{ color: 'var(--text-3)', fontSize: '0.75rem', textAlign: 'center', lineHeight: 1.3 }}>
              💰 {stealPrice} · {canAffordSteal ? 'puedes permitírtelo' : `te faltan ${stealPrice - myBalance}`}
            </span>
          </button>

          <button
            className="btn-ghost"
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              gap: '0.4rem', padding: '1rem', borderRadius: 10,
              border: '2px solid var(--border)', height: 'auto',
            }}
            onClick={onChooseTrade}
          >
            <span style={{ fontSize: '1.5rem' }}>⇄</span>
            <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Proponer intercambio</span>
            <span style={{ color: 'var(--text-3)', fontSize: '0.75rem', textAlign: 'center', lineHeight: 1.3 }}>
              Ofrece uno de tus pokémon a cambio
            </span>
          </button>
        </div>

      </div>
    </div>
  );
}
