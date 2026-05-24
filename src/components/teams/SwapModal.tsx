import { useState } from 'react';
import type { BenchEntry, DraftPick, Tier } from '../../api/pokemons';
import type { LeagueSettings } from '../../api/leagues';
import TierBadge from '../TierBadge';
import { spriteUrl } from '../../utils/sprites';
import { tierRank, priceForTier } from '../../utils/tiers';

interface SwapModalProps {
  benchEntry: BenchEntry;
  myPicks: DraftPick[];
  myBalance: number;
  tierByName: Map<string, Tier | null | undefined>;
  leagueSettings: LeagueSettings | undefined;
  swapping: boolean;
  onConfirm: (give: string) => void;
  onClose: () => void;
  onBack?: () => void;
}

export default function SwapModal({
  benchEntry, myPicks, myBalance, tierByName, leagueSettings, swapping, onConfirm, onClose, onBack,
}: SwapModalProps) {
  const [giveTarget, setGiveTarget] = useState<string | null>(null);
  const takeTier = (benchEntry.tier as Tier | undefined) ?? tierByName.get(benchEntry.pokemonName);
  const takeTierRank = tierRank(takeTier);

  const giveTarget_tier = giveTarget ? tierByName.get(giveTarget) : undefined;
  const priceGive = giveTarget ? priceForTier(leagueSettings, giveTarget_tier) : 0;
  const priceTake = priceForTier(leagueSettings, takeTier);
  const net = priceGive - priceTake; // positive = receive coins; negative = pay coins

  // Net coin change after selection (only meaningful if giveTarget is valid)
  const netCostAbovePrice = giveTarget && tierRank(giveTarget_tier) <= takeTierRank
    ? net
    : null;

  // Overall affordability: bench entry base price + net (if negative)
  const basePrice = benchEntry.price ?? 0;
  const extraCost = netCostAbovePrice !== null && netCostAbovePrice < 0 ? -netCostAbovePrice : 0;
  const totalCost = basePrice + extraCost;
  const canAffordBase = basePrice === 0 || myBalance >= basePrice;

  return (
    <div
      className="modal-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal animate-in-fast" style={{ maxWidth: 520 }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '1.15rem' }}>Intercambio de banca</h2>
          <button
            className="btn-ghost"
            style={{ padding: '0.2rem 0.55rem', fontSize: '1rem', lineHeight: 1 }}
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        {/* Incoming pokemon */}
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
              src={spriteUrl(benchEntry.pokemonId)}
              alt={benchEntry.pokemonName}
              style={{ width: 80, height: 80, imageRendering: 'pixelated', display: 'block' }}
            />
            <TierBadge tier={takeTier} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: '1.05rem', textTransform: 'capitalize', marginBottom: '0.35rem' }}>
              {benchEntry.pokemonName}
            </div>
            {takeTier && (
              <div style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginBottom: '0.45rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Tier {takeTier}
              </div>
            )}
            {basePrice > 0 ? (
              <span className="coin-badge coin-badge-lg">💰 {basePrice} monedas</span>
            ) : (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                color: 'var(--green)', fontSize: '0.85rem', fontWeight: 600,
              }}>
                ✓ Gratis
              </span>
            )}
          </div>
        </div>

        {/* Balance row (only shown when there's a base cost) */}
        {basePrice > 0 && (
          <div style={{
            background: canAffordBase ? 'rgba(52,211,153,0.05)' : 'rgba(248,113,113,0.05)',
            border: `1px solid ${canAffordBase ? 'rgba(52,211,153,0.18)' : 'rgba(248,113,113,0.18)'}`,
            borderRadius: 10,
            padding: '0.75rem 1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.75rem',
            flexWrap: 'wrap',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-2)' }}>Tu saldo</span>
              <span className="coin-badge" style={!canAffordBase ? {
                background: 'rgba(107,114,128,0.15)',
                borderColor: 'rgba(107,114,128,0.25)',
                color: '#9ca3af',
              } : {}}>
                💰 {myBalance}
              </span>
            </div>
            {canAffordBase ? (
              <span style={{ fontSize: '0.8rem', color: 'var(--green)', fontWeight: 600 }}>
                ✓ Saldo suficiente
              </span>
            ) : (
              <span style={{ fontSize: '0.8rem', color: 'var(--red)', fontWeight: 600 }}>
                Te faltan {basePrice - myBalance} monedas
              </span>
            )}
          </div>
        )}

        {/* Can't afford base — stop here */}
        {!canAffordBase && (
          <p style={{ fontSize: '0.875rem', color: 'var(--text-2)', textAlign: 'center', padding: '0.5rem 0' }}>
            Necesitas <strong style={{ color: 'var(--accent)' }}>💰 {basePrice}</strong> para fichar a este pokémon.
          </p>
        )}

        {/* Team pokemon selection */}
        {canAffordBase && myPicks.length > 0 && (
          <>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-2)', fontWeight: 500, marginBottom: '0.25rem' }}>
              ¿Qué pokémon de tu equipo entregas?
            </p>
            <div
              className="pokemon-grid"
              style={{ maxHeight: 260, overflowY: 'auto', paddingRight: '0.25rem' }}
            >
              {myPicks.map((pick) => {
                const giveTier = tierByName.get(pick.pokemonName);
                const isInvalidTier = tierRank(giveTier) > takeTierRank;
                const isChosen = giveTarget === pick.pokemonName;

                return (
                  <div
                    key={pick.pokemonName}
                    className="pokemon-card"
                    style={{
                      cursor: isInvalidTier ? 'not-allowed' : 'pointer',
                      opacity: isInvalidTier ? 0.4 : 1,
                      border: isChosen ? '1px solid var(--accent)' : undefined,
                      background: isChosen ? 'var(--accent-dim)' : undefined,
                      transform: isChosen ? 'translateY(-2px)' : undefined,
                      boxShadow: isChosen ? '0 0 14px var(--accent-glow)' : undefined,
                    }}
                    title={isInvalidTier ? `Tier ${giveTier ?? '?'} — no puedes dar un tier inferior` : undefined}
                    onClick={() => !isInvalidTier && setGiveTarget(isChosen ? null : pick.pokemonName)}
                  >
                    <img
                      src={spriteUrl(pick.pokemonId)}
                      alt={pick.pokemonName}
                      className="pokemon-sprite"
                      loading="lazy"
                    />
                    <span className="pokemon-name">{pick.pokemonName}</span>
                    <TierBadge tier={giveTier} />
                  </div>
                );
              })}
            </div>

            {/* Net coin change after selecting a give pokemon */}
            {netCostAbovePrice !== null && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.6rem 0.9rem',
                borderRadius: 8,
                background: netCostAbovePrice > 0
                  ? 'rgba(52,211,153,0.07)'
                  : netCostAbovePrice < 0
                  ? 'rgba(248,113,113,0.07)'
                  : 'rgba(255,255,255,0.04)',
                border: `1px solid ${
                  netCostAbovePrice > 0
                    ? 'rgba(52,211,153,0.2)'
                    : netCostAbovePrice < 0
                    ? 'rgba(248,113,113,0.2)'
                    : 'rgba(255,255,255,0.1)'
                }`,
                fontSize: '0.82rem',
              }}>
                {netCostAbovePrice > 0 ? (
                  <>
                    <span style={{ color: 'var(--green)', fontWeight: 700 }}>+💰 {netCostAbovePrice}</span>
                    <span style={{ color: 'var(--text-2)' }}>— recibes monedas por dar un tier superior</span>
                  </>
                ) : netCostAbovePrice < 0 ? (
                  <>
                    <span style={{ color: 'var(--red)', fontWeight: 700 }}>−💰 {-netCostAbovePrice}</span>
                    <span style={{ color: 'var(--text-2)' }}>— pagas la diferencia de tier</span>
                  </>
                ) : (
                  <span style={{ color: 'var(--text-3)' }}>Sin coste adicional</span>
                )}
                {netCostAbovePrice < 0 && myBalance < totalCost && (
                  <span style={{ color: 'var(--red)', marginLeft: 'auto' }}>
                    Saldo insuficiente
                  </span>
                )}
              </div>
            )}
          </>
        )}

        <div className="modal-actions">
          {onBack ? (
            <button className="btn-ghost" onClick={onBack} disabled={swapping}>
              ← Volver
            </button>
          ) : (
            <button className="btn-ghost" onClick={onClose} disabled={swapping}>
              Cancelar
            </button>
          )}
          {canAffordBase && (
            <button
              className="btn-primary"
              disabled={!giveTarget || swapping || (netCostAbovePrice !== null && netCostAbovePrice < 0 && myBalance < totalCost)}
              onClick={() => giveTarget && onConfirm(giveTarget)}
            >
              {swapping ? 'Intercambiando…' : 'Confirmar intercambio'}
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
