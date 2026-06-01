import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { getClosedList, getDraftStatus, assignTier } from '../api/pokemons';
import type { ClosedListEntry, Tier, TierChange } from '../api/pokemons';
import { getLeagueDetail } from '../api/leagues';
import { useToastStore } from '../store/toastStore';
import { extractErrorMessage } from '../utils/errorMessage';
import { SkeletonGrid } from '../components/SkeletonGrid';
import PageHeader from '../components/PageHeader';

const TIERS: Tier[] = ['S', 'A', 'B', 'C', 'D'];

function spriteUrl(pokemonId: number) {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemonId}.png`;
}

function tierRank(t: Tier): number {
  return { S: 0, A: 1, B: 2, C: 3, D: 4 }[t];
}

// ── Tier color helpers ────────────────────────────────────────────────────────

const TIER_COLORS: Record<Tier, { bg: string; border: string; text: string }> = {
  S: { bg: 'rgba(248,113,113,0.1)',  border: 'rgba(248,113,113,0.3)',  text: '#f87171' },
  A: { bg: 'rgba(251,191,36,0.1)',   border: 'rgba(251,191,36,0.3)',   text: '#fbbf24' },
  B: { bg: 'rgba(52,211,153,0.1)',   border: 'rgba(52,211,153,0.3)',   text: '#34d399' },
  C: { bg: 'rgba(129,140,248,0.1)',  border: 'rgba(129,140,248,0.3)',  text: '#818cf8' },
  D: { bg: 'var(--surface-2)',       border: 'var(--border)',          text: 'var(--text-3)' },
};

// ── TierAdjustModal ───────────────────────────────────────────────────────────

interface TierAdjustModalProps {
  entry: ClosedListEntry;
  adjusting: boolean;
  onConfirm: (newTier: Tier) => void;
  onClose: () => void;
}

function TierAdjustModal({ entry, adjusting, onConfirm, onClose }: TierAdjustModalProps) {
  const [selected, setSelected] = useState<Tier | null>(null);
  const currentTier = entry.tier!;
  const steps = selected ? Math.abs(tierRank(selected) - tierRank(currentTier)) - 1 : null;
  const colors = TIER_COLORS[currentTier];

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal animate-in-fast" style={{ maxWidth: 420 }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '1.15rem' }}>Ajustar tier</h2>
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
          background: 'var(--surface-2)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          padding: '1rem 1.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1.25rem',
        }}>
          <img
            src={spriteUrl(entry.pokemonId)}
            alt={entry.pokemonName}
            style={{ width: 80, height: 80, imageRendering: 'pixelated', display: 'block', flexShrink: 0 }}
          />
          <div>
            <div style={{ fontWeight: 700, fontSize: '1.05rem', textTransform: 'capitalize', marginBottom: '0.4rem' }}>
              {entry.pokemonName}
            </div>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 26, height: 26,
              borderRadius: '50%',
              fontSize: '0.75rem',
              fontWeight: 800,
              background: colors.bg,
              border: `1px solid ${colors.border}`,
              color: colors.text,
            }}>
              {currentTier}
            </span>
          </div>
        </div>

        {/* Tier selector */}
        <div>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-2)', marginBottom: '0.6rem' }}>
            Nuevo tier:
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {TIERS.filter((t) => t !== currentTier).map((t) => {
              const c = TIER_COLORS[t];
              const isSelected = selected === t;
              return (
                <button
                  key={t}
                  onClick={() => setSelected(t)}
                  style={{
                    width: 40, height: 40,
                    borderRadius: '50%',
                    fontSize: '0.85rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    border: isSelected ? `2px solid ${c.text}` : `1px solid ${c.border}`,
                    background: isSelected ? c.bg : 'var(--surface-2)',
                    color: isSelected ? c.text : 'var(--text-2)',
                    transition: 'all 0.15s',
                  }}
                >
                  {t}
                </button>
              );
            })}
          </div>
        </div>

        {/* Cascade warning */}
        {steps !== null && steps > 0 && (
          <div style={{
            padding: '0.6rem 0.9rem',
            borderRadius: 8,
            background: 'rgba(251,191,36,0.06)',
            border: '1px solid rgba(251,191,36,0.22)',
            fontSize: '0.82rem',
            color: '#fbbf24',
          }}>
            Esto producira una cascada de {steps} {steps === 1 ? 'intercambio adicional' : 'intercambios adicionales'} para mantener los conteos equilibrados.
          </div>
        )}

        <div className="modal-actions">
          <button className="btn-ghost" onClick={onClose} disabled={adjusting}>
            Cancelar
          </button>
          <button
            className="btn-primary"
            disabled={!selected || adjusting}
            onClick={() => selected && onConfirm(selected)}
          >
            {adjusting ? 'Ajustando...' : 'Confirmar'}
          </button>
        </div>

      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function TierManagementPage() {
  const { leagueId } = useParams<{ leagueId: string }>();
  const username = useAuthStore((s) => s.username);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const addToast = useToastStore((s) => s.addToast);
  const [activeTab, setActiveTab] = useState<Tier>('S');
  const [modalEntry, setModalEntry] = useState<ClosedListEntry | null>(null);
  const [lastChanges, setLastChanges] = useState<TierChange[]>([]);

  const { data: closedList = [], isLoading: loadingList } = useQuery({
    queryKey: ['closed-list', leagueId],
    queryFn: () => getClosedList(leagueId!),
    enabled: !!leagueId,
    staleTime: 30_000,
  });

  const { data: draft } = useQuery({
    queryKey: ['draft-status', leagueId],
    queryFn: () => getDraftStatus(leagueId!),
    enabled: !!leagueId,
    staleTime: 30_000,
  });

  const { data: league } = useQuery({
    queryKey: ['league-detail', leagueId],
    queryFn: () => getLeagueDetail(leagueId!),
    enabled: !!leagueId,
    staleTime: 60_000,
  });

  const isAdmin = league?.members.some(
    (m) => m.username === username && m.leagueRole === 'ADMIN'
  ) ?? false;

  const isDraftCompleted = draft?.status === 'COMPLETED';

  // Redirect if not admin (once data is loaded)
  if (league && !isAdmin) {
    navigate(`/leagues/${leagueId}`);
    return null;
  }

  const { mutate: doAdjust, isPending: adjusting } = useMutation({
    mutationFn: ({ entryId, tier }: { entryId: string; tier: Tier }) =>
      assignTier(leagueId!, entryId, tier),
    onSuccess: (data) => {
      setLastChanges(data.changes);
      setModalEntry(null);
      addToast('success', 'Tier ajustado');
      queryClient.invalidateQueries({ queryKey: ['closed-list', leagueId] });
    },
    onError: (err) => addToast('error', extractErrorMessage(err, 'Error al ajustar tier')),
  });

  const countByTier = (t: Tier) => closedList.filter((e) => e.tier === t).length;
  const tabEntries = closedList.filter((e) => e.tier === activeTab);

  return (
    <div className="page-wrapper">
      <PageHeader left={
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button className="btn-back" onClick={() => navigate(`/leagues/${leagueId}`)}>Ligas</button>
          <span className="logo" onClick={() => navigate('/leagues')}>PokeFantasy</span>
        </div>
      } />

      {/* Tier adjust modal */}
      {modalEntry && (
        <TierAdjustModal
          entry={modalEntry}
          adjusting={adjusting}
          onConfirm={(tier) => doAdjust({ entryId: modalEntry.id, tier })}
          onClose={() => setModalEntry(null)}
        />
      )}

      <main className="page-content">
        <h1 className="page-title">Gestion de tiers</h1>

        {!isDraftCompleted && (
          <div className="empty-state">
            <p>El draft debe estar completado para ajustar tiers.</p>
            <button className="btn-ghost" onClick={() => navigate(`/leagues/${leagueId}`)}>
              Volver a la liga
            </button>
          </div>
        )}

        {isDraftCompleted && (
          <>
            {/* Tier tabs */}
            <div className="gen-tabs" style={{ marginBottom: '1.5rem' }}>
              {TIERS.map((t) => {
                const c = TIER_COLORS[t];
                const isActive = activeTab === t;
                const count = countByTier(t);
                return (
                  <button
                    key={t}
                    className={`gen-tab${isActive ? ' active' : ''}`}
                    onClick={() => { setActiveTab(t); setLastChanges([]); }}
                    style={isActive ? {
                      borderColor: c.text,
                      background: c.bg,
                      color: c.text,
                    } : {}}
                  >
                    Tier {t} ({count})
                  </button>
                );
              })}
            </div>

            {/* Last changes panel */}
            {lastChanges.length > 0 && (
              <div style={{
                padding: '0.75rem 1rem',
                borderRadius: 10,
                background: 'rgba(52,211,153,0.06)',
                border: '1px solid rgba(52,211,153,0.2)',
                fontSize: '0.82rem',
                marginBottom: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.2rem',
              }}>
                <div style={{ fontWeight: 600, color: 'var(--green)', marginBottom: '0.25rem' }}>
                  Tiers actualizados
                </div>
                {lastChanges.map((c) => (
                  <div key={c.pokemonId} style={{ color: 'var(--text-2)', textTransform: 'capitalize' }}>
                    {c.pokemonName}: {c.oldTier} → {c.newTier}
                  </div>
                ))}
                <button
                  className="btn-ghost"
                  style={{ alignSelf: 'flex-start', marginTop: '0.35rem', fontSize: '0.75rem', padding: '0.15rem 0.5rem' }}
                  onClick={() => setLastChanges([])}
                >
                  Cerrar
                </button>
              </div>
            )}

            {/* Pokemon grid */}
            {loadingList ? (
              <SkeletonGrid count={6} />
            ) : tabEntries.length === 0 ? (
              <p style={{ color: 'var(--text-3)', fontSize: '0.875rem' }}>
                No hay pokémon en tier {activeTab}.
              </p>
            ) : (
              <div className="pokemon-grid">
                {tabEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className="pokemon-card"
                    style={{ cursor: 'pointer' }}
                    onClick={() => { setLastChanges([]); setModalEntry(entry); }}
                    title="Cambiar tier"
                  >
                    <img
                      src={spriteUrl(entry.pokemonId)}
                      alt={entry.pokemonName}
                      className="pokemon-sprite"
                      loading="lazy"
                    />
                    <span className="pokemon-name">{entry.pokemonName}</span>
                    <span
                      className={`tier-badge tier-badge-${activeTab.toLowerCase()}`}
                      style={{ position: 'static', marginTop: '0.25rem' }}
                    >
                      {activeTab}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
