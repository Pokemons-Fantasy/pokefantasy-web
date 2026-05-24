import { useState } from 'react';
import type { DraftPick, Tier } from '../../api/pokemons';
import TierBadge from '../TierBadge';
import { spriteUrl } from '../../utils/sprites';

interface SetPriceModalProps {
  pick: DraftPick;
  currentPrice: number;
  myBalance: number;
  tierByName: Map<string, Tier | null | undefined>;
  saving: boolean;
  error: string;
  onConfirm: (newPrice: number) => void;
  onClose: () => void;
}

export default function SetPriceModal({
  pick, currentPrice, myBalance, tierByName, saving, error, onConfirm, onClose,
}: SetPriceModalProps) {
  const [inputVal, setInputVal] = useState('');
  const tier = tierByName.get(pick.pokemonName);
  const parsed = parseInt(inputVal, 10);
  const newPrice = isNaN(parsed) ? 0 : parsed;
  const investment = newPrice > currentPrice ? newPrice - currentPrice : 0;
  const isValid = newPrice > currentPrice;
  const canAfford = myBalance >= investment;

  return (
    <div
      className="modal-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal animate-in-fast" style={{ maxWidth: 400 }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '1.15rem' }}>Subir precio de robo</h2>
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
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          padding: '0.75rem 1rem',
          background: 'var(--surface-2)',
          borderRadius: 10,
          border: '1px solid var(--border)',
        }}>
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <img
              src={spriteUrl(pick.pokemonId)}
              alt={pick.pokemonName}
              style={{ width: 56, height: 56, imageRendering: 'pixelated', display: 'block' }}
            />
            <TierBadge tier={tier} />
          </div>
          <div>
            <div style={{ fontWeight: 600, textTransform: 'capitalize', marginBottom: '0.25rem' }}>
              {pick.pokemonName}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-3)' }}>
              Precio actual: <span className="coin-badge" style={{ fontSize: '0.72rem', marginLeft: '0.3rem' }}>💰 {currentPrice}</span>
            </div>
          </div>
        </div>

        {/* Input */}
        <div>
          <label style={{ fontSize: '0.82rem', color: 'var(--text-2)', display: 'block', marginBottom: '0.4rem' }}>
            Nuevo precio (debe ser mayor que {currentPrice})
          </label>
          <input
            type="number"
            min={currentPrice + 1}
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            placeholder={`> ${currentPrice}`}
            style={{
              width: '100%',
              padding: '0.5rem 0.75rem',
              background: 'var(--surface-2)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              color: 'var(--text-1)',
              fontSize: '0.9rem',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Investment summary */}
        {isValid && (
          <div style={{
            padding: '0.6rem 0.9rem',
            borderRadius: 8,
            background: canAfford ? 'rgba(52,211,153,0.05)' : 'rgba(248,113,113,0.05)',
            border: `1px solid ${canAfford ? 'rgba(52,211,153,0.18)' : 'rgba(248,113,113,0.18)'}`,
            display: 'flex',
            flexDirection: 'column',
            gap: '0.35rem',
            fontSize: '0.82rem',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-2)' }}>Inversión</span>
              <span style={{ color: canAfford ? 'var(--accent)' : 'var(--red)', fontWeight: 600 }}>💰 {investment}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-2)' }}>Tu saldo</span>
              <span>💰 {myBalance}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-3)' }}>Si te roban, recibirías</span>
              <span style={{ color: 'var(--green)', fontWeight: 600 }}>💰 {newPrice * 2}</span>
            </div>
            {!canAfford && (
              <span style={{ color: 'var(--red)', fontWeight: 600 }}>
                Saldo insuficiente — te faltan {investment - myBalance} monedas
              </span>
            )}
          </div>
        )}

        {error && <p className="error">{error}</p>}

        <div className="modal-actions">
          <button className="btn-ghost" onClick={onClose} disabled={saving}>
            Cancelar
          </button>
          <button
            className="btn-primary"
            disabled={!isValid || !canAfford || saving}
            onClick={() => isValid && canAfford && onConfirm(newPrice)}
          >
            {saving ? 'Guardando…' : `Invertir 💰 ${investment}`}
          </button>
        </div>

      </div>
    </div>
  );
}
