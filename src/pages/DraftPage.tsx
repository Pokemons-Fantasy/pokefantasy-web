import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { useAuthStore } from '../store/authStore';
import { getDraftStatus, draftPick, getClosedList, cancelDraft, autoPickDraft } from '../api/pokemons';
import type { ClosedListEntry } from '../api/pokemons';
import TierBadge from '../components/TierBadge';
import { SkeletonTable } from '../components/SkeletonTable';
import PokemonDetailModal from '../components/PokemonDetailModal';
import { getLeagueDetail } from '../api/leagues';
import { useToastStore } from '../store/toastStore';
import { extractErrorMessage } from '../utils/errorMessage';
import PageHeader from '../components/PageHeader';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { spriteUrl } from '../utils/sprites';
import { useReducedMotion } from '../hooks/useReducedMotion';

export default function DraftPage() {
  const { leagueId } = useParams<{ leagueId: string }>();
  const username = useAuthStore((s) => s.username);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);
  const [search, setSearch] = useState('');
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [detailEntry, setDetailEntry] = useState<ClosedListEntry | null>(null);
  const [pendingPick, setPendingPick] = useState<ClosedListEntry | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const prefersReducedMotion = useReducedMotion();

  const { data: draft, isLoading } = useQuery({
    queryKey: ['draft-status', leagueId],
    queryFn: () => getDraftStatus(leagueId!),
    enabled: !!leagueId,
  });

  // SSE — actualización en tiempo real; fallback a polling cada 10 s si la conexión se cierra
  useEffect(() => {
    if (!leagueId) return;
    const BASE = import.meta.env.VITE_API_URL ?? 'https://pokefantasy.onrender.com';
    const es = new EventSource(`${BASE}/v1/leagues/${leagueId}/draft/events`);

    es.addEventListener('draft-updated', () => {
      queryClient.invalidateQueries({ queryKey: ['draft-status', leagueId] });
    });

    const fallback = setInterval(() => {
      if (es.readyState === EventSource.CLOSED) {
        queryClient.invalidateQueries({ queryKey: ['draft-status', leagueId] });
      }
    }, 10_000);

    return () => {
      es.close();
      clearInterval(fallback);
    };
  }, [leagueId, queryClient]);

  const { data: pool = [] } = useQuery({
    queryKey: ['closed-list', leagueId],
    queryFn: () => getClosedList(leagueId!),
    enabled: !!leagueId,
  });

  const { data: league } = useQuery({
    queryKey: ['league-detail', leagueId],
    queryFn: () => getLeagueDetail(leagueId!),
    enabled: !!leagueId,
  });

  const isAdmin = league?.members.some(
    (m) => m.username === username && m.leagueRole === 'ADMIN'
  );

  const pickedNames = new Set(draft?.picks?.map((p) => p.pokemonName) ?? []);
  const availablePool = pool.filter((p) => !pickedNames.has(p.pokemonName));
  const filtered = availablePool.filter((p) =>
    p.pokemonName.toLowerCase().includes(search.toLowerCase())
  );

  const isMyTurn = draft?.status === 'IN_PROGRESS' && draft.currentTurn === username;

  const { mutate: pick, isPending: picking } = useMutation({
    mutationFn: (pokemonName: string) => draftPick(leagueId!, pokemonName),
    onSuccess: () => {
      Haptics.impact({ style: ImpactStyle.Medium });
      queryClient.invalidateQueries({ queryKey: ['draft-status', leagueId] });
      queryClient.invalidateQueries({ queryKey: ['closed-list', leagueId] });
    },
    onError: (err) => {
      addToast('error', extractErrorMessage(err, 'Error al hacer pick'));
      queryClient.invalidateQueries({ queryKey: ['draft-status', leagueId] });
    },
  });

  const { mutate: cancel, isPending: cancelling } = useMutation({
    mutationFn: () => cancelDraft(leagueId!),
    onSuccess: () => {
      setShowCancelModal(false);
      queryClient.invalidateQueries({ queryKey: ['draft-status', leagueId] });
      queryClient.invalidateQueries({ queryKey: ['league-detail', leagueId] });
    },
    onError: (err) => {
      setShowCancelModal(false);
      addToast('error', extractErrorMessage(err, 'Error al cancelar el draft'));
    },
  });

  const { mutate: triggerAutoPick } = useMutation({
    mutationFn: () => autoPickDraft(leagueId!),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['draft-status', leagueId] }),
    onError: () => {}, // silenciar — otro cliente puede haber disparado el auto-pick primero
  });

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- pendiente, ver roadmap-frontend.md Fase 1
    if (!draft?.turnDeadline) { setSecondsLeft(null); return; }
    const update = () => {
      const diff = Math.ceil((new Date(draft.turnDeadline!).getTime() - Date.now()) / 1000);
      if (diff <= 0) {
        setSecondsLeft(0);
        triggerAutoPick();
      } else {
        setSecondsLeft(diff);
      }
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft?.turnDeadline]);

  const statusLabel = !draft ? '—'
    : draft.status === 'COMPLETED' ? 'Completado'
    : draft.status === 'IN_PROGRESS' ? 'En progreso'
    : draft.status === 'CANCELLED' ? 'Cancelado'
    : 'Pendiente';

  const statusClass = !draft ? 'muted'
    : draft.status === 'COMPLETED' ? 'muted'
    : draft.status === 'IN_PROGRESS' ? 'green'
    : 'muted';

  return (
    <div className="page-wrapper">
      <PageHeader left={
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button className="btn-back" onClick={() => navigate(`/leagues/${leagueId}`)}>← Liga</button>
          <span className="logo" onClick={() => navigate('/leagues')}>PokeFantasy</span>
        </div>
      } />

      <main className="page-content">
        <div className="section-header">
          <h1 className="page-title">Draft</h1>
          <div className="section-actions">
            {(draft?.picks?.length ?? 0) > 0 && (
              <button className="btn-ghost" onClick={() => navigate(`/leagues/${leagueId}/teams`)}>
                Ver equipos
              </button>
            )}
            {draft?.status === 'COMPLETED' && (
              <button className="btn-secondary" onClick={() => navigate(`/leagues/${leagueId}/config`)}>
                ⚙️ Configuración
              </button>
            )}
            {isAdmin && draft?.status === 'IN_PROGRESS' && (
              <button className="btn-danger" onClick={() => setShowCancelModal(true)}>
                Cancelar draft
              </button>
            )}
          </div>
        </div>

        {isLoading && <SkeletonTable rows={5} />}
        {!isLoading && !draft && (
          <div className="empty-state">
            <p>No hay draft activo en esta liga.</p>
            <p style={{ marginTop: '0.4rem' }}>El admin debe iniciarlo desde el panel.</p>
          </div>
        )}

        {draft && (
          <div className="draft-status-bar">
            <div>
              <div className="draft-stat-label">Estado</div>
              <div className={`draft-stat-value ${statusClass}`}>{statusLabel}</div>
            </div>
            {draft.status === 'IN_PROGRESS' && (
              <div>
                <div className="draft-stat-label">Turno actual</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div className="draft-stat-value accent">{draft.currentTurn}</div>
                  {secondsLeft !== null && (() => {
                    const urgent = secondsLeft <= 10;
                    const urgency = urgent ? (10 - secondsLeft) / 10 : 0; // 0..1
                    return (
                      <motion.span
                        key={urgent ? 'urgent' : 'calm'}
                        animate={urgent && !prefersReducedMotion ? { scale: [1, 1.06 + urgency * 0.14, 1] } : { scale: 1 }}
                        transition={
                          urgent && !prefersReducedMotion
                            ? { duration: 0.9 - urgency * 0.5, repeat: Infinity, ease: 'easeInOut' }
                            : { duration: 0.2 }
                        }
                        style={{
                          display: 'inline-block',
                          fontWeight: 600,
                          fontSize: '0.875rem',
                          color: urgent ? 'var(--red, #ef4444)' : 'var(--text-2)',
                        }}
                      >
                        ⏱ {secondsLeft}s
                      </motion.span>
                    );
                  })()}
                </div>
              </div>
            )}
            {draft.status === 'IN_PROGRESS' && (
              <div>
                <div className="draft-stat-label">Ronda</div>
                <div className="draft-stat-value">{draft.currentRound}</div>
              </div>
            )}
            <div>
              <div className="draft-stat-label">Picks totales</div>
              <div className="draft-stat-value">{draft.picks?.length ?? 0}</div>
            </div>
          </div>
        )}

        {draft?.status === 'IN_PROGRESS' && (
          isMyTurn ? (
            <>
              <div className="my-turn-banner animate-in">
                <span className="my-turn-dot" />
                ⚡ ¡Es tu turno! Elige un pokémon del pool
              </div>
              <input
                className="search-input"
                type="text"
                placeholder="Buscar en el pool..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <div className="pokemon-grid">
                {filtered.map((entry) => (
                  <div
                    key={entry.id}
                    className={`pokemon-card ${picking ? 'nominated' : ''}`}
                    onClick={() => { if (!picking) setPendingPick(entry); }}
                  >
                    <img src={spriteUrl(entry.pokemonId)} alt={entry.pokemonName} className="pokemon-sprite" />
                    <span className="pokemon-name">{entry.pokemonName}</span>
                    <TierBadge tier={entry.tier} />
                    <button
                      className="pokemon-info-btn"
                      onClick={(e) => { e.stopPropagation(); setDetailEntry(entry); }}
                      title="Ver detalles"
                    >
                      i
                    </button>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p style={{ color: 'var(--text-2)', fontSize: '0.9rem' }}>
              Esperando el turno de <strong style={{ color: 'var(--accent)' }}>{draft.currentTurn}</strong>...
            </p>
          )
        )}

        {draft && ((draft.draftHistory ?? draft.picks)?.length ?? 0) > 0 && (
          <div style={{ marginTop: '2.5rem' }}>
            <p className="section-label">Historial de picks</p>
            <div className="picks-table-container">
              <table className="picks-table">
                <thead>
                  <tr>
                    <th>Ronda</th>
                    <th>Jugador</th>
                    <th>Pokémon</th>
                  </tr>
                </thead>
                <tbody>
                  {(draft.draftHistory ?? draft.picks).map((p, i) => (
                    <tr key={i}>
                      <td style={{ color: 'var(--text-3)' }}>{p.round}</td>
                      <td style={{ fontWeight: 600 }}>{p.username}</td>
                      <td style={{ textTransform: 'capitalize' }}>{p.pokemonName}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {showCancelModal && (
        <div className="modal-overlay" onClick={() => setShowCancelModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>¿Cancelar el draft?</h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-2)' }}>
              El draft se cancelará y podrás iniciar uno nuevo. Los picks ya realizados no se revierten.
            </p>
            <div className="modal-actions">
              <button className="btn-ghost" onClick={() => setShowCancelModal(false)}>
                Volver
              </button>
              <button className="btn-danger" disabled={cancelling} onClick={() => cancel()}>
                {cancelling ? 'Cancelando...' : 'Sí, cancelar'}
              </button>
            </div>
          </div>
        </div>
      )}
      {pendingPick && (
        <div className="modal-overlay" onClick={() => setPendingPick(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>¿Confirmar pick?</h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-2)' }}>
              Vas a elegir a <strong>{pendingPick.pokemonName}</strong>. Esta acción no se puede deshacer.
            </p>
            <div className="modal-actions">
              <button className="btn-ghost" onClick={() => setPendingPick(null)}>
                Cancelar
              </button>
              <button
                className="btn-primary"
                disabled={picking}
                onClick={() => {
                  pick(pendingPick.pokemonName);
                  setPendingPick(null);
                }}
              >
                {picking ? 'Pickeando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
      {detailEntry && (
        <PokemonDetailModal
          pokemonId={detailEntry.pokemonId}
          pokemonName={detailEntry.pokemonName}
          tier={detailEntry.tier}
          stats={detailEntry.stats}
          types={detailEntry.types}
          onClose={() => setDetailEntry(null)}
        />
      )}
    </div>
  );
}
