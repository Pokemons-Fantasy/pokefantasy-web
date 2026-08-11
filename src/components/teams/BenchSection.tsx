import type { BenchEntry, ClosedListEntry, Tier } from '../../api/pokemons';
import TierBadge from '../TierBadge';
import { spriteUrl } from '../../utils/sprites';

interface BenchSectionProps {
  bench: BenchEntry[];
  swapWindowClosed: boolean;
  canInteract: boolean;
  myBalance: number;
  tierByName: Map<string, Tier | null | undefined>;
  onCardClick: (entry: BenchEntry) => void;
  onInfo: (entry: ClosedListEntry | null) => void;
  entryByName: Map<string, ClosedListEntry>;
}

export default function BenchSection({
  bench, swapWindowClosed, canInteract, myBalance, tierByName, onCardClick, onInfo, entryByName,
}: BenchSectionProps) {
  return (
    <div style={{ marginTop: '3rem' }}>
      <hr className="divider" />
      <p className="section-label">Banca</p>

      {bench.length === 0 ? (
        <p style={{ color: 'var(--text-3)', fontSize: '0.875rem' }}>
          No quedan pokémons en la banca.
        </p>
      ) : (
        <>
          {!swapWindowClosed && canInteract && (
            <p style={{ color: 'var(--text-2)', fontSize: '0.875rem', marginBottom: '1rem' }}>
              Haz click en un pokémon de la banca para intercambiarlo o comprarlo.
            </p>
          )}
          <div className="pokemon-grid">
            {bench.map((entry) => {
              const price = entry.price ?? 0;
              const canAfford = price === 0 || myBalance >= price;
              const isClickable = !swapWindowClosed && canInteract;
              const tier = (entry.tier as Tier | undefined) ?? tierByName.get(entry.pokemonName);

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
                        background: canAfford ? 'rgba(251,191,36,0.12)' : 'rgba(107,114,128,0.15)',
                        borderColor: canAfford ? 'rgba(251,191,36,0.3)' : 'rgba(107,114,128,0.25)',
                        color: canAfford ? 'var(--accent)' : '#9ca3af',
                      }}
                    >
                      💰 {price}
                    </span>
                  ) : (
                    <span style={{ marginTop: '0.3rem', fontSize: '0.68rem', color: 'var(--green)', fontWeight: 600 }}>
                      Gratis
                    </span>
                  )}
                  <button
                    className="pokemon-info-btn"
                    onClick={(e) => { e.stopPropagation(); onInfo(entryByName.get(entry.pokemonName) ?? null); }}
                    title="Ver detalles"
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
