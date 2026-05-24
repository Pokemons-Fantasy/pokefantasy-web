import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { proposeTrade } from '../api/trades';
import { spriteUrl } from '../utils/sprites';
import { useToastStore } from '../store/toastStore';
import { extractErrorMessage } from '../utils/errorMessage';

interface PokemonRef {
  name: string;
  id: number;
}

interface Props {
  leagueId: string;
  responder: string;
  responderPokemon: PokemonRef;
  myTeam: PokemonRef[];
  onClose: () => void;
}

export default function ProposeTradeModal({
  leagueId,
  responder,
  responderPokemon,
  myTeam,
  onClose,
}: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const [coins, setCoins] = useState(0);
  const addToast = useToastStore((s) => s.addToast);
  const queryClient = useQueryClient();

  const { mutate, isPending } = useMutation({
    mutationFn: () =>
      proposeTrade(leagueId, {
        responder,
        proposerPokemonName: selected!,
        responderPokemonName: responderPokemon.name,
        coinsOffered: coins,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trades', leagueId] });
      addToast('success', 'Propuesta enviada');
      onClose();
    },
    onError: (err) => addToast('error', extractErrorMessage(err, 'Error al enviar la propuesta')),
  });

  const selectedPokemon = myTeam.find((p) => p.name === selected);

  return (
    <div
      className="modal-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="modal animate-in-fast"
        style={{ maxWidth: 480, padding: '0', overflow: 'hidden' }}
      >
        {/* ── Header ── */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '1rem 1.25rem 0.75rem',
            borderBottom: '1px solid var(--border)',
          }}
        >
          <div>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>
              Proponer intercambio
            </h2>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-3)', margin: '0.15rem 0 0' }}>
              con <strong style={{ color: 'var(--text-2)' }}>{responder}</strong>
            </p>
          </div>
          <button
            className="btn-ghost"
            style={{ padding: '0.2rem 0.55rem', fontSize: '1rem', lineHeight: 1 }}
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <div style={{ padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          {/* ── Trade preview: give ↔ receive ── */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr auto 1fr',
              alignItems: 'center',
              gap: '0.75rem',
            }}
          >
            {/* Give side */}
            <div
              style={{
                background: selected ? 'var(--accent-dim)' : 'var(--surface-2)',
                border: `1px solid ${selected ? 'var(--accent)' : 'var(--border)'}`,
                borderRadius: 12,
                padding: '0.75rem',
                textAlign: 'center',
                transition: 'background 0.2s, border-color 0.2s',
                minHeight: 110,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.25rem',
              }}
            >
              {selectedPokemon ? (
                <>
                  <img
                    src={spriteUrl(selectedPokemon.id)}
                    alt={selectedPokemon.name}
                    style={{ width: 64, height: 64, imageRendering: 'pixelated' }}
                  />
                  <span
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      textTransform: 'capitalize',
                      color: 'var(--text-1)',
                    }}
                  >
                    {selectedPokemon.name}
                  </span>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-3)' }}>Entregas</span>
                </>
              ) : (
                <>
                  <span style={{ fontSize: '1.5rem', opacity: 0.3 }}>?</span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-3)' }}>Elige abajo</span>
                </>
              )}
            </div>

            {/* Arrow */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.15rem',
                color: 'var(--text-3)',
                fontSize: '0.9rem',
              }}
            >
              <span>⇄</span>
              {coins > 0 && (
                <span
                  className="coin-badge"
                  style={{ fontSize: '0.65rem', whiteSpace: 'nowrap' }}
                >
                  +💰 {coins}
                </span>
              )}
            </div>

            {/* Receive side */}
            <div
              style={{
                background: 'var(--surface-2)',
                border: '1px solid var(--border)',
                borderRadius: 12,
                padding: '0.75rem',
                textAlign: 'center',
                minHeight: 110,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.25rem',
              }}
            >
              <img
                src={spriteUrl(responderPokemon.id)}
                alt={responderPokemon.name}
                style={{ width: 64, height: 64, imageRendering: 'pixelated' }}
              />
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  textTransform: 'capitalize',
                  color: 'var(--text-1)',
                }}
              >
                {responderPokemon.name}
              </span>
              <span style={{ fontSize: '0.65rem', color: 'var(--text-3)' }}>
                Recibes de {responder}
              </span>
            </div>
          </div>

          {/* ── Give selector ── */}
          <div>
            <p
              style={{
                fontSize: '0.8rem',
                color: 'var(--text-2)',
                fontWeight: 500,
                marginBottom: '0.4rem',
              }}
            >
              ¿Qué Pokémon entregas?
            </p>
            {myTeam.length === 0 ? (
              <p style={{ fontSize: '0.8rem', color: 'var(--text-3)' }}>
                No tienes Pokémon en el equipo.
              </p>
            ) : (
              <div
                className="pokemon-grid"
                style={{ maxHeight: 200, overflowY: 'auto', paddingRight: '0.15rem' }}
              >
                {myTeam.map((p) => {
                  const isChosen = selected === p.name;
                  return (
                    <div
                      key={p.name}
                      className="pokemon-card"
                      style={{
                        cursor: 'pointer',
                        border: isChosen ? '1px solid var(--accent)' : undefined,
                        background: isChosen ? 'var(--accent-dim)' : undefined,
                        transform: isChosen ? 'translateY(-2px)' : undefined,
                        boxShadow: isChosen ? '0 0 14px var(--accent-glow)' : undefined,
                        transition: 'transform 0.15s, box-shadow 0.15s',
                      }}
                      onClick={() => setSelected(isChosen ? null : p.name)}
                    >
                      <img
                        src={spriteUrl(p.id)}
                        alt={p.name}
                        className="pokemon-sprite"
                        loading="lazy"
                      />
                      <span className="pokemon-name">{p.name}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Coins input ── */}
          <div>
            <label
              style={{
                fontSize: '0.8rem',
                color: 'var(--text-2)',
                fontWeight: 500,
                display: 'block',
                marginBottom: '0.4rem',
              }}
            >
              Monedas a ofrecer <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>(opcional)</span>
            </label>
            <input
              type="number"
              min={0}
              value={coins}
              onChange={(e) => setCoins(Math.max(0, parseInt(e.target.value, 10) || 0))}
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
            {coins > 0 && (
              <p
                style={{
                  fontSize: '0.75rem',
                  color: 'var(--text-3)',
                  marginTop: '0.3rem',
                }}
              >
                💰 {responder} recibirá {coins} monedas si acepta.
              </p>
            )}
          </div>

          {/* ── Actions ── */}
          <div className="modal-actions">
            <button className="btn-ghost" onClick={onClose} disabled={isPending}>
              Cancelar
            </button>
            <button
              className="btn-primary"
              disabled={!selected || isPending}
              onClick={() => selected && mutate()}
            >
              {isPending ? 'Enviando…' : 'Enviar propuesta'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
