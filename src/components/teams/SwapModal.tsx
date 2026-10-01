import { useState } from 'react';
import type { BenchEntry, DraftPick, Tier } from '../../api/pokemons';
import type { LeagueSettings } from '../../api/leagues';
import TierBadge from '../TierBadge';
import { spriteUrl } from '../../utils/sprites';
import { coinsLabel } from '../../utils/coins';
import { isPickLocked } from '../../utils/teams';
import { swapQuote } from '../../utils/benchSwap';

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

/**
 * Cambiar un Pokémon del equipo por uno de la banca. Se paga (o se cobra) la diferencia de precio de mercado
 * entre los dos tiers: subir de tier cuesta, bajar da monedas. El que se entrega debe estar desbloqueado.
 */
export default function SwapModal({
  benchEntry, myPicks, myBalance, tierByName, leagueSettings, swapping, onConfirm, onClose, onBack,
}: SwapModalProps) {
  const [giveTarget, setGiveTarget] = useState<string | null>(null);
  const takeTier = (benchEntry.tier as Tier | undefined) ?? tierByName.get(benchEntry.pokemonName);
  const marketPrice = benchEntry.price ?? 0;
  const quote = giveTarget
    ? swapQuote(leagueSettings, tierByName.get(giveTarget), takeTier, myBalance)
    : null;

  return (
    <div
      className="modal-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal animate-in-fast" style={{ maxWidth: 520 }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '1.15rem' }}>Intercambio con el banquillo</h2>
          <button
            className="btn-ghost"
            style={{ padding: '0.2rem 0.55rem', fontSize: '1rem', lineHeight: 1 }}
            onClick={onClose}
            aria-label="Cerrar"
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
            {marketPrice > 0 ? (
              <span className="coin-badge coin-badge-lg" title="Precio de mercado de su tier">💰 {coinsLabel(marketPrice)}</span>
            ) : (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                color: 'var(--success)', fontSize: '0.85rem', fontWeight: 600,
              }}>
                ✓ Gratis
              </span>
            )}
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>Tu saldo</div>
            <span className="coin-badge">💰 {myBalance}</span>
          </div>
        </div>

        {/* Team pokemon selection */}
        {myPicks.length > 0 && (
          <>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-2)', fontWeight: 500, marginBottom: '0.25rem' }}>
              ¿Qué Pokémon de tu equipo entregas? Si es de un tier inferior, pagas la diferencia.
            </p>
            <div
              className="pokemon-grid pokemon-grid-modal"
              style={{ maxHeight: 260, overflowY: 'auto', paddingRight: '0.25rem' }}
            >
              {myPicks.map((pick) => {
                const giveTier = tierByName.get(pick.pokemonName);
                const locked = isPickLocked(pick);
                const isChosen = giveTarget === pick.pokemonName;
                const choose = () => !locked && setGiveTarget(isChosen ? null : pick.pokemonName);

                return (
                  <div
                    key={pick.pokemonName}
                    role="button"
                    tabIndex={locked ? -1 : 0}
                    aria-pressed={isChosen}
                    aria-disabled={locked}
                    className="pokemon-card"
                    style={{
                      cursor: locked ? 'not-allowed' : 'pointer',
                      opacity: locked ? 0.4 : 1,
                      border: isChosen ? '1px solid var(--accent)' : undefined,
                      background: isChosen ? 'var(--accent-dim)' : undefined,
                      transform: isChosen ? 'translateY(-2px)' : undefined,
                      boxShadow: isChosen ? '0 0 14px var(--accent-glow)' : undefined,
                    }}
                    title={locked ? 'Bloqueado: recién robado o intercambiado' : undefined}
                    onClick={choose}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); choose(); }
                    }}
                  >
                    <img
                      src={spriteUrl(pick.pokemonId)}
                      alt={pick.pokemonName}
                      className="pokemon-sprite"
                      loading="lazy"
                    />
                    <span className="pokemon-name">{pick.pokemonName}</span>
                    <TierBadge tier={giveTier} />
                    {locked && <span style={{ fontSize: '0.68rem', color: 'var(--warning)' }}>🔒 Bloqueado</span>}
                  </div>
                );
              })}
            </div>

            {/* Monedas del intercambio y saldo resultante */}
            {quote && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '0.35rem 0.5rem',
                padding: '0.6rem 0.9rem',
                borderRadius: 8,
                background: quote.net > 0 ? 'var(--success-bg)' : quote.net < 0 ? 'var(--danger-bg)' : 'var(--surface-2)',
                border: `1px solid ${
                  quote.net > 0 ? 'var(--success-border)' : quote.net < 0 ? 'var(--danger-border)' : 'var(--border)'
                }`,
                fontSize: '0.82rem',
              }}>
                {quote.net > 0 ? (
                  <>
                    <span style={{ color: 'var(--success)', fontWeight: 700 }}>+💰 {quote.net}</span>
                    <span style={{ color: 'var(--text-2)' }}>: recibes la diferencia por bajar de tier</span>
                  </>
                ) : quote.net < 0 ? (
                  <>
                    <span style={{ color: 'var(--danger)', fontWeight: 700 }}>−💰 {-quote.net}</span>
                    <span style={{ color: 'var(--text-2)' }}>: pagas la diferencia de tier</span>
                  </>
                ) : (
                  <span style={{ color: 'var(--text-3)' }}>Sin coste adicional</span>
                )}
                <span style={{ marginLeft: 'auto', fontWeight: 600, color: quote.affordable ? 'var(--text)' : 'var(--danger)' }}>
                  {quote.affordable
                    ? `Te quedan 💰 ${quote.balanceAfter}`
                    : `Te faltan ${coinsLabel(-quote.balanceAfter)}`}
                </span>
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
          <button
            className="btn-primary"
            disabled={!giveTarget || swapping || !quote?.affordable}
            onClick={() => giveTarget && onConfirm(giveTarget)}
          >
            {swapping ? 'Intercambiando…' : 'Confirmar intercambio'}
          </button>
        </div>

      </div>
    </div>
  );
}
