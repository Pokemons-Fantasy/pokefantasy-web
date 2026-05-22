import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getTrades, respondToTrade, cancelTrade } from '../api/trades';
import type { Trade } from '../api/trades';

interface Props {
  leagueId: string;
  currentUsername: string;
  onClose: () => void;
}

function spriteUrl(id: number) {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`;
}

function StatusBadge({ status }: { status: Trade['status'] }) {
  const cfg: Record<Trade['status'], { label: string; color: string; bg: string }> = {
    ACCEPTED: { label: 'Aceptado', color: 'var(--green)', bg: 'rgba(52,211,153,0.12)' },
    REJECTED: { label: 'Rechazado', color: '#f87171', bg: 'rgba(248,113,113,0.1)' },
    CANCELLED: { label: 'Cancelado', color: '#6b7280', bg: 'rgba(107,114,128,0.12)' },
    PENDING: { label: 'Pendiente', color: 'var(--accent)', bg: 'var(--accent-dim)' },
  };
  const { label, color, bg } = cfg[status];
  return (
    <span
      style={{
        fontSize: '0.65rem',
        fontWeight: 700,
        letterSpacing: '0.05em',
        textTransform: 'uppercase',
        padding: '0.2rem 0.5rem',
        borderRadius: 4,
        background: bg,
        color,
        flexShrink: 0,
      }}
    >
      {label}
    </span>
  );
}

function PokemonPill({ id, name }: { id: number; name: string }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '0.15rem',
        minWidth: 56,
      }}
    >
      <img
        src={spriteUrl(id)}
        alt={name}
        style={{ width: 48, height: 48, imageRendering: 'pixelated' }}
        loading="lazy"
      />
      <span
        style={{
          fontSize: '0.65rem',
          textTransform: 'capitalize',
          color: 'var(--text-2)',
          textAlign: 'center',
          maxWidth: 64,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {name}
      </span>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.6rem',
        marginBottom: '0.5rem',
      }}
    >
      <span
        style={{
          fontSize: '0.7rem',
          fontWeight: 700,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: 'var(--text-3)',
          whiteSpace: 'nowrap',
        }}
      >
        {children}
      </span>
      <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
    </div>
  );
}

export default function TradesModal({ leagueId, currentUsername, onClose }: Props) {
  const queryClient = useQueryClient();
  const [historyOpen, setHistoryOpen] = useState(false);
  const [incomingError, setIncomingError] = useState('');
  const [outgoingError, setOutgoingError] = useState('');

  const { data: trades = [], isLoading } = useQuery({
    queryKey: ['trades', leagueId],
    queryFn: () => getTrades(leagueId),
    staleTime: 30_000,
  });

  const incoming = trades.filter(
    (t) => t.status === 'PENDING' && t.responder === currentUsername
  );
  const outgoing = trades.filter(
    (t) => t.status === 'PENDING' && t.proposer === currentUsername
  );
  const history = trades.filter((t) => t.status !== 'PENDING');

  const { mutate: doAccept, isPending: accepting } = useMutation({
    mutationFn: (tradeId: string) => respondToTrade(leagueId, tradeId, true),
    onSuccess: () => {
      setIncomingError('');
      queryClient.invalidateQueries({ queryKey: ['trades', leagueId] });
      queryClient.invalidateQueries({ queryKey: ['draft-status', leagueId] });
      queryClient.invalidateQueries({ queryKey: ['my-coins', leagueId] });
      queryClient.invalidateQueries({ queryKey: ['my-pending-trades'] });
    },
    onError: (err: unknown) => {
      setIncomingError(
        (err as any)?.response?.data?.message ??
          (err instanceof Error ? err.message : 'Error al aceptar')
      );
    },
  });

  const { mutate: doReject, isPending: rejecting } = useMutation({
    mutationFn: (tradeId: string) => respondToTrade(leagueId, tradeId, false),
    onSuccess: () => {
      setIncomingError('');
      queryClient.invalidateQueries({ queryKey: ['trades', leagueId] });
      queryClient.invalidateQueries({ queryKey: ['my-pending-trades'] });
    },
    onError: (err: unknown) => {
      setIncomingError(
        (err as any)?.response?.data?.message ??
          (err instanceof Error ? err.message : 'Error al rechazar')
      );
    },
  });

  const { mutate: doCancel, isPending: cancelling } = useMutation({
    mutationFn: (tradeId: string) => cancelTrade(leagueId, tradeId),
    onSuccess: () => {
      setOutgoingError('');
      queryClient.invalidateQueries({ queryKey: ['trades', leagueId] });
    },
    onError: (err: unknown) => {
      setOutgoingError(
        (err as any)?.response?.data?.message ??
          (err instanceof Error ? err.message : 'Error al cancelar')
      );
    },
  });

  const isMutating = accepting || rejecting || cancelling;

  return (
    <div
      className="modal-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="modal animate-in-fast"
        style={{ maxWidth: 560, padding: 0, overflow: 'hidden' }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '1rem 1.25rem 0.75rem',
            borderBottom: '1px solid var(--border)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>
              Intercambios
            </h2>
            {incoming.length > 0 && (
              <span
                style={{
                  background: 'var(--accent)',
                  color: '#fff',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  borderRadius: '50%',
                  width: 20,
                  height: 20,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {incoming.length}
              </span>
            )}
          </div>
          <button
            className="btn-ghost"
            style={{ padding: '0.2rem 0.55rem', fontSize: '1rem', lineHeight: 1 }}
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div
          style={{
            padding: '1rem 1.25rem',
            overflowY: 'auto',
            maxHeight: '70vh',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem',
          }}
        >
          {isLoading && (
            <p style={{ color: 'var(--text-3)', fontSize: '0.875rem', textAlign: 'center' }}>
              Cargando…
            </p>
          )}

          {/* ── Incoming ── */}
          {!isLoading && (
            <div>
              <SectionLabel>Propuestas recibidas</SectionLabel>
              {incomingError && <p className="error" style={{ marginBottom: '0.5rem' }}>{incomingError}</p>}
              {incoming.length === 0 ? (
                <p style={{ fontSize: '0.82rem', color: 'var(--text-3)', padding: '0.5rem 0' }}>
                  Sin propuestas pendientes.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  {incoming.map((trade) => (
                    <TradeRow
                      key={trade.id}
                      trade={trade}
                      label={<><strong>{trade.proposer}</strong> te propone:</>}
                      actions={
                        <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }}>
                          <button
                            className="btn-primary"
                            style={{
                              fontSize: '0.75rem',
                              padding: '0.3rem 0.65rem',
                              background: 'rgba(52,211,153,0.85)',
                            }}
                            disabled={isMutating}
                            onClick={() => doAccept(trade.id)}
                          >
                            Aceptar
                          </button>
                          <button
                            className="btn-ghost"
                            style={{
                              fontSize: '0.75rem',
                              padding: '0.3rem 0.65rem',
                              color: '#f87171',
                              borderColor: 'rgba(248,113,113,0.3)',
                            }}
                            disabled={isMutating}
                            onClick={() => doReject(trade.id)}
                          >
                            Rechazar
                          </button>
                        </div>
                      }
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Outgoing ── */}
          {!isLoading && (
            <div>
              <SectionLabel>Propuestas enviadas</SectionLabel>
              {outgoingError && <p className="error" style={{ marginBottom: '0.5rem' }}>{outgoingError}</p>}
              {outgoing.length === 0 ? (
                <p style={{ fontSize: '0.82rem', color: 'var(--text-3)', padding: '0.5rem 0' }}>
                  Sin propuestas activas.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  {outgoing.map((trade) => (
                    <TradeRow
                      key={trade.id}
                      trade={trade}
                      label={<>Propuesta a <strong>{trade.responder}</strong>:</>}
                      actions={
                        <button
                          className="btn-ghost"
                          style={{
                            fontSize: '0.75rem',
                            padding: '0.3rem 0.65rem',
                            color: '#f87171',
                            borderColor: 'rgba(248,113,113,0.3)',
                            flexShrink: 0,
                          }}
                          disabled={isMutating}
                          onClick={() => doCancel(trade.id)}
                        >
                          Cancelar
                        </button>
                      }
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── History ── */}
          {!isLoading && history.length > 0 && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: historyOpen ? '0.5rem' : 0 }}>
                <button
                  className="btn-ghost"
                  style={{ fontSize: '0.72rem', padding: '0.2rem 0.5rem' }}
                  onClick={() => setHistoryOpen((o) => !o)}
                >
                  {historyOpen ? '▲ Ocultar historial' : `▼ Ver historial (${history.length})`}
                </button>
                <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
              </div>

              {historyOpen && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {history.map((trade) => (
                    <HistoryRow key={trade.id} trade={trade} currentUsername={currentUsername} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

interface TradeRowProps {
  trade: Trade;
  label: React.ReactNode;
  actions: React.ReactNode;
}

function TradeRow({ trade, label, actions }: TradeRowProps) {
  return (
    <div
      style={{
        background: 'var(--surface-2)',
        border: '1px solid var(--border)',
        borderRadius: 10,
        padding: '0.65rem 0.85rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
      }}
    >
      <div style={{ fontSize: '0.75rem', color: 'var(--text-2)' }}>{label}</div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
        <PokemonPill id={trade.proposerPokemonId} name={trade.proposerPokemonName} />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' }}>
          <span style={{ color: 'var(--text-3)', fontSize: '0.85rem' }}>⇄</span>
          {trade.coinsOffered > 0 && (
            <span className="coin-badge" style={{ fontSize: '0.62rem' }}>
              +💰 {trade.coinsOffered}
            </span>
          )}
        </div>
        <PokemonPill id={trade.responderPokemonId} name={trade.responderPokemonName} />
        <div style={{ flex: 1 }} />
        {actions}
      </div>
    </div>
  );
}

function HistoryRow({ trade, currentUsername }: { trade: Trade; currentUsername: string }) {
  const isProposer = trade.proposer === currentUsername;
  const resolvedDate = trade.resolvedAt
    ? new Date(trade.resolvedAt).toLocaleDateString()
    : '—';

  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid var(--border)',
        borderRadius: 8,
        padding: '0.55rem 0.85rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.6rem',
        flexWrap: 'wrap',
        opacity: 0.75,
      }}
    >
      <StatusBadge status={trade.status} />
      <span style={{ fontSize: '0.72rem', color: 'var(--text-3)', flexShrink: 0 }}>
        {isProposer ? `→ ${trade.responder}` : `← ${trade.proposer}`}
      </span>
      <span
        style={{ fontSize: '0.72rem', color: 'var(--text-2)', textTransform: 'capitalize' }}
      >
        {trade.proposerPokemonName} ⇄ {trade.responderPokemonName}
      </span>
      <span style={{ flex: 1 }} />
      <span style={{ fontSize: '0.65rem', color: 'var(--text-3)', flexShrink: 0 }}>
        {resolvedDate}
      </span>
    </div>
  );
}
