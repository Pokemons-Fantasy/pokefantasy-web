import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { getDraftStatus, draftPick, getClosedList, cancelDraft } from '../api/pokemons';
import type { ClosedListEntry } from '../api/pokemons';
import TierBadge from '../components/TierBadge';
import { SkeletonTable } from '../components/SkeletonTable';
import PokemonDetailModal from '../components/PokemonDetailModal';
import { getLeagueDetail } from '../api/leagues';
import { useToastStore } from '../store/toastStore';
import { extractErrorMessage } from '../utils/errorMessage';

export default function DraftPage() {
  const { leagueId } = useParams<{ leagueId: string }>();
  const username = useAuthStore((s) => s.username);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);
  const [search, setSearch] = useState('');
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [detailEntry, setDetailEntry] = useState<ClosedListEntry | null>(null);

  const { data: draft, isLoading } = useQuery({
    queryKey: ['draft-status', leagueId],
    queryFn: () => getDraftStatus(leagueId!),
    refetchInterval: 5000,
    enabled: !!leagueId,
  });

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
      <header className="page-header">
        <div className="page-header-inner">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button className="btn-back" onClick={() => navigate(`/leagues/${leagueId}`)}>
              ← Liga
            </button>
            <span className="logo" onClick={() => navigate('/leagues')}>PokeFantasy</span>
          </div>
          <div className="header-right">
            <span className="header-user">Hola, <strong>{username}</strong></span>
            <button className="btn-ghost" onClick={logout}>Cerrar sesión</button>
          </div>
        </div>
      </header>

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
                <div className="draft-stat-value accent">{draft.currentTurn}</div>
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
                    onClick={() => { if (!picking) pick(entry.pokemonName); }}
                  >
                    <img src={entry.sprite} alt={entry.pokemonName} className="pokemon-sprite" />
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
