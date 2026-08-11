import { useEffect, useRef } from 'react';
import type { Tier } from '../api/pokemons';
import { spriteUrl } from '../utils/sprites';
import { TYPE_COLORS, TIER_COLORS } from '../utils/colors';

interface Stats {
  hp: number;
  attack: number;
  defense: number;
  specialAttack: number;
  specialDefense: number;
  speed: number;
}

interface Props {
  pokemonId: number;
  pokemonName: string;
  tier?: Tier | null;
  stats?: Stats | null;
  types?: string[];
  onClose: () => void;
}

const STAT_META: { key: keyof Stats; label: string; color: string }[] = [
  { key: 'hp',             label: 'HP',  color: '#4ade80' },
  { key: 'attack',         label: 'Atk', color: '#f87171' },
  { key: 'defense',        label: 'Def', color: '#60a5fa' },
  { key: 'specialAttack',  label: 'SpA', color: '#c084fc' },
  { key: 'specialDefense', label: 'SpD', color: '#2dd4bf' },
  { key: 'speed',          label: 'Spe', color: '#fbbf24' },
];

export default function PokemonDetailModal({ pokemonId, pokemonName, tier, stats, types, onClose }: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    dialogRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        ref={dialogRef}
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pokemon-detail-title"
        style={{ maxWidth: 480, gap: '0.75rem' }}
        onClick={(e) => e.stopPropagation()}
        tabIndex={-1}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 id="pokemon-detail-title" style={{ margin: 0, fontSize: '1.15rem' }}>{pokemonName}</h2>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', color: 'var(--text-3)',
              fontSize: '1.2rem', cursor: 'pointer', padding: '0 0.25rem', lineHeight: 1,
            }}
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>

        {/* Body: two columns */}
        <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'flex-start' }}>

          {/* Left column: sprite + types */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
            <div style={{
              background: 'radial-gradient(circle at center, rgba(251,191,36,0.07) 0%, transparent 70%)',
              borderRadius: 12,
              width: 104,
              height: 104,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <img
                src={spriteUrl(pokemonId)}
                alt={pokemonName}
                width={96}
                height={96}
                style={{ imageRendering: 'pixelated', filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.4))' }}
              />
            </div>
            {types && types.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', alignItems: 'center' }}>
                {types.map((t) => {
                  const tc = TYPE_COLORS[t.toLowerCase()];
                  return (
                    <span
                      key={t}
                      style={{
                        padding: '0.2rem 0.65rem',
                        borderRadius: 999,
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        color: tc?.color ?? 'var(--text-2)',
                        background: tc?.bg ?? 'var(--surface-2)',
                        border: `1px solid ${tc?.color ?? 'var(--border)'}33`,
                        textTransform: 'capitalize',
                      }}
                    >
                      {t}
                    </span>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right column: tier + stats */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {tier && (
              <div style={{ marginBottom: '0.75rem' }}>
                <span style={{
                  display: 'inline-block',
                  padding: '0.2rem 0.65rem',
                  borderRadius: 6,
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  color: TIER_COLORS[tier]?.text ?? 'var(--text)',
                  background: TIER_COLORS[tier]?.bg ?? 'var(--surface-2)',
                  border: `1px solid ${TIER_COLORS[tier]?.border ?? 'var(--border)'}`,
                }}>
                  Tier {tier}
                </span>
              </div>
            )}

            {stats ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.38rem' }}>
                {STAT_META.map(({ key, label, color }) => {
                  const val = stats[key];
                  const pct = Math.min(100, Math.round((val / 255) * 100));
                  return (
                    <div key={key} style={{ display: 'grid', gridTemplateColumns: '3rem 2.4rem 1fr', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-3)', textAlign: 'right' }}>{label}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text)', textAlign: 'right', fontFamily: "'Space Mono', monospace" }}>{val}</span>
                      <div
                        role="meter"
                        aria-valuenow={val}
                        aria-valuemin={0}
                        aria-valuemax={255}
                        aria-label={label}
                        style={{ height: 6, background: 'rgba(255,255,255,0.07)', borderRadius: 999, overflow: 'hidden' }}
                      >
                        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 999 }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p style={{ fontSize: '0.82rem', color: 'var(--text-3)', margin: 0 }}>Sin datos de stats</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
