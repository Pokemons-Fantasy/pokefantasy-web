import type { BenchEntry, ClosedListEntry, DraftPick, Tier } from '../../api/pokemons';
import type { LeagueSettings } from '../../api/leagues';
import TierBadge from '../TierBadge';
import { spriteUrl } from '../../utils/sprites';
import { upgradeOffer } from '../../utils/benchSwap';
import { coinsLabel } from '../../utils/coins';

interface BenchSectionProps {
  bench: BenchEntry[];
  swapWindowClosed: boolean;
  canInteract: boolean;
  myBalance: number;
  /** Tu equipo y los precios de la liga: para marcar las mejoras al alcance. */
  myPicks: DraftPick[];
  leagueSettings: LeagueSettings | undefined;
  tierByName: Map<string, Tier | null | undefined>;
  onCardClick: (entry: BenchEntry) => void;
  onInfo: (entry: ClosedListEntry | null) => void;
  entryByName: Map<string, ClosedListEntry>;
}

export default function BenchSection({
  bench, swapWindowClosed, canInteract, myBalance, myPicks, leagueSettings, tierByName, onCardClick, onInfo, entryByName,
}: BenchSectionProps) {
  const tierOf = (entry: BenchEntry) => (entry.tier as Tier | undefined) ?? tierByName.get(entry.pokemonName);
  const offers = new Map(
    !swapWindowClosed && canInteract
      ? bench.map((entry) => [entry.pokemonName, upgradeOffer(tierOf(entry), myPicks, tierByName, leagueSettings, myBalance)])
      : [],
  );
  const anyOffer = [...offers.values()].some(Boolean);

  return (
    <div style={{ marginTop: '3rem' }}>
      <hr className="divider" />
      <p className="section-label">Banquillo</p>

      {bench.length === 0 ? (
        <p style={{ color: 'var(--text-3)', fontSize: '0.875rem' }}>
          No quedan Pokémon en el banquillo.
        </p>
      ) : (
        <>
          {!swapWindowClosed && canInteract && (
            <p style={{ color: 'var(--text-2)', fontSize: '0.875rem', marginBottom: '1rem' }}>
              Pulsa un Pokémon del banquillo para intercambiarlo o comprarlo.
              {anyOffer && ' ⬆ Mejora: lo consigues entregando tu Pokémon de peor tier y pagando la diferencia.'}
            </p>
          )}
          <div className="pokemon-grid">
            {bench.map((entry) => {
              const price = entry.price ?? 0;
              const canAfford = price === 0 || myBalance >= price;
              const isClickable = !swapWindowClosed && canInteract;
              const tier = tierOf(entry);
              const offer = offers.get(entry.pokemonName);

              return (
                <div
                  key={entry.pokemonName}
                  className="pokemon-card"
                  style={{
                    cursor: isClickable ? 'pointer' : 'default',
                    opacity: isClickable && !canAfford ? 0.5 : 1,
                  }}
                  title={
                    swapWindowClosed
                      ? 'Intercambios cerrados'
                      : isClickable
                      ? 'Intercambiar o comprar'
                      : undefined
                  }
                  onClick={() => isClickable && onCardClick(entry)}
                >
                  <img src={spriteUrl(entry.pokemonId)} alt={entry.pokemonName} className="pokemon-sprite" loading="lazy" />
                  <span className="pokemon-name">{entry.pokemonName}</span>
                  <TierBadge tier={tier} />

                  {price > 0 ? (
                    <span
                      className="coin-badge"
                      style={{
                        marginTop: '0.3rem',
                        fontSize: '0.7rem',
                        background: canAfford ? 'var(--accent-dim)' : 'rgba(107,114,128,0.15)',
                        borderColor: canAfford ? 'var(--accent-glow)' : 'rgba(107,114,128,0.25)',
                        color: canAfford ? 'var(--accent)' : 'var(--text-3)',
                      }}
                    >
                      💰 {price}
                    </span>
                  ) : (
                    <span style={{ marginTop: '0.3rem', fontSize: '0.68rem', color: 'var(--success)', fontWeight: 600 }}>
                      Gratis
                    </span>
                  )}
                  {offer && (
                    <span
                      className="bench-upgrade-chip"
                      title={`Entregando a ${offer.give} pagas ${coinsLabel(offer.cost)}`}
                    >
                      <span>⬆ Mejora</span>
                      <span>{offer.cost > 0 ? `−💰 ${offer.cost}` : 'gratis'}</span>
                    </span>
                  )}
                  <button
                    className="pokemon-info-btn"
                    onClick={(e) => { e.stopPropagation(); onInfo(entryByName.get(entry.pokemonName) ?? null); }}
                    title="Ver detalles"
                    aria-label="Ver detalles"
                  >
                    i
                  </button>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
