import { useState } from 'react';
import type { BenchEntry, DraftPick, Tier } from '../../api/pokemons';
import TierBadge from '../TierBadge';
import { spriteUrl } from '../../utils/sprites';

interface BenchActionModalProps {
  benchEntry: BenchEntry;
  myPicks: DraftPick[];
  myBalance: number;
  tierByName: Map<string, Tier | null | undefined>;
  buying: boolean;
  buyError: string;
  onChooseSwap: () => void;
  onBuyConfirm: () => void;
  onClose: () => void;
}

export default function BenchActionModal({
  benchEntry, myPicks, myBalance, tierByName,
  buying, buyError, onChooseSwap, onBuyConfirm, onClose,
}: BenchActionModalProps) {
  const [view, setView] = useState<'choose' | 'buy'>('choose');

  const price = benchEntry.price ?? 0;
  const canAffordBuy = myBalance >= price;
  const hasTeam = myPicks.length > 0;

  const tier = (benchEntry.tier as Tier | undefined) ?? tierByName.get(benchEntry.pokemonName);

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal animate-in-fast" style={{ maxWidth: 480 }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '1.15rem' }}>
            {view === 'choose' ? 'Banca' : 'Comprar de la banca'}
          </h2>
          <button
            className="btn-ghost"
            style={{ padding: '0.2rem 0.55rem', fontSize: '1rem', lineHeight: 1 }}
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        {/* Pokemon header — always visible */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '1rem',
          background: 'var(--surface-2)', border: '1px solid var(--border)',
          borderRadius: 12, padding: '1rem 1.25rem', marginTop: '1rem',
        }}>
          <img
            src={spriteUrl(benchEntry.pokemonId)}
            alt={benchEntry.pokemonName}
            style={{ width: 72, height: 72, imageRendering: 'pixelated' }}
          />
          <div>
            <div style={{ fontWeight: 700, fontSize: '1.05rem', textTransform: 'capitalize' }}>
              {benchEntry.pokemonName}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
              {tier && <TierBadge tier={tier} />}
              <span style={{ color: 'var(--text-2)', fontSize: '0.82rem' }}>
                Precio: <strong style={{ color: 'var(--text)' }}>💰 {price}</strong>
              </span>
            </div>
            <div style={{ color: 'var(--text-3)', fontSize: '0.78rem', marginTop: '0.15rem' }}>
              Tu saldo: 💰 {myBalance}
            </div>
          </div>
        </div>

        {/* ── Vista: elegir acción ── */}
        {view === 'choose' && (
          <div style={{ display: 'grid', gridTemplateColumns: hasTeam ? '1fr 1fr' : '1fr', gap: '0.75rem', marginTop: '1.25rem' }}>
            {hasTeam && (
              <button
                className="btn-ghost"
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  gap: '0.4rem', padding: '1rem', borderRadius: 10,
                  border: '2px solid var(--border)', height: 'auto',
                }}
                onClick={onChooseSwap}
              >
                <span style={{ fontSize: '1.5rem' }}>🔄</span>
                <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Intercambiar</span>
                <span style={{ color: 'var(--text-3)', fontSize: '0.75rem', textAlign: 'center', lineHeight: 1.3 }}>
                  Da uno de tus pokémon y recibe este
                </span>
              </button>
            )}
            <button
              className="btn-ghost"
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                gap: '0.4rem', padding: '1rem', borderRadius: 10,
                border: '2px solid var(--border)', height: 'auto',
                opacity: canAffordBuy ? 1 : 0.5,
              }}
              onClick={() => canAffordBuy && setView('buy')}
              disabled={!canAffordBuy}
              title={!canAffordBuy ? `Necesitas ${price} monedas (tienes ${myBalance})` : undefined}
            >
              <span style={{ fontSize: '1.5rem' }}>🛒</span>
              <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Comprar</span>
              <span style={{ color: 'var(--text-3)', fontSize: '0.75rem', textAlign: 'center', lineHeight: 1.3 }}>
                Añade este pokémon por 💰 {price}
              </span>
            </button>
          </div>
        )}

        {/* ── Vista: comprar — confirmación ── */}
        {view === 'buy' && (
          <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{
              background: 'var(--surface-2)', border: '1px solid var(--border)',
              borderRadius: 10, padding: '1rem',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                <span style={{ color: 'var(--text-2)' }}>Saldo actual</span>
                <span style={{ fontWeight: 600 }}>💰 {myBalance}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                <span style={{ color: 'var(--text-2)' }}>Coste</span>
                <span style={{ color: '#f87171', fontWeight: 600 }}>−💰 {price}</span>
              </div>
              <div style={{
                borderTop: '1px solid var(--border)', paddingTop: '0.5rem',
                display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem',
              }}>
                <span style={{ fontWeight: 700 }}>Saldo tras compra</span>
                <span style={{ color: 'var(--green)', fontWeight: 700 }}>💰 {myBalance - price}</span>
              </div>
            </div>
            {buyError && <p className="error">{buyError}</p>}
            <div className="modal-actions">
              <button className="btn-ghost" onClick={() => setView('choose')} disabled={buying}>
                ← Volver
              </button>
              <button className="btn-primary" onClick={onBuyConfirm} disabled={buying}>
                {buying ? 'Comprando…' : 'Confirmar compra'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
