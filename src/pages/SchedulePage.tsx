import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { getLeagueDetail } from '../api/leagues';
import {
  getSchedule,
  recordMatchResult,
  correctMatchResult,
  revertMatchResult,
  getMyCoinBalance,
  type MatchDto,
  type JornadaDto,
} from '../api/leagues';
import { useToastStore } from '../store/toastStore';
import { extractErrorMessage } from '../utils/errorMessage';
import { parseScore, scoreLabel, SCORE_MAX } from '../utils/score';
import { SkeletonTable } from '../components/SkeletonTable';
import PageHeader from '../components/PageHeader';

export default function SchedulePage() {
  const { leagueId } = useParams<{ leagueId: string }>();
  const username = useAuthStore((s) => s.username);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const addToast = useToastStore((s) => s.addToast);
  const [pendingMatch, setPendingMatch] = useState<MatchDto | null>(null);
  const [editingMatch, setEditingMatch] = useState<MatchDto | null>(null);
  // Marcador del modal abierto (texto de los inputs): ganador – perdedor.
  const [winnerScore, setWinnerScore] = useState('');
  const [loserScore, setLoserScore] = useState('');
  const { score, error: scoreError } = parseScore(winnerScore, loserScore);

  function openRecord(match: MatchDto) {
    setWinnerScore('');
    setLoserScore('');
    setPendingMatch(match);
  }

  function openEdit(match: MatchDto) {
    setWinnerScore(match.winnerScore != null ? String(match.winnerScore) : '');
    setLoserScore(match.loserScore != null ? String(match.loserScore) : '');
    setEditingMatch(match);
  }

  const { data: league } = useQuery({
    queryKey: ['league-detail', leagueId],
    queryFn: () => getLeagueDetail(leagueId!),
    enabled: !!leagueId,
  });

  const { data: schedule, isLoading } = useQuery({
    queryKey: ['schedule', leagueId],
    queryFn: () => getSchedule(leagueId!),
    enabled: !!leagueId,
  });

  const { data: myCoins } = useQuery({
    queryKey: ['my-coins', leagueId],
    queryFn: () => getMyCoinBalance(leagueId!),
    enabled: !!leagueId,
    staleTime: 30_000,
  });

  const isAdmin = league?.members.some(
    (m) => m.username === username && m.leagueRole === 'ADMIN'
  );

  const { mutate: recordResult, isPending: recording } = useMutation({
    mutationFn: ({ matchId, winner }: { matchId: string; winner: string }) =>
      recordMatchResult(leagueId!, matchId, winner, score),
    onSuccess: () => {
      setPendingMatch(null);
      addToast('success', 'Resultado guardado');
      queryClient.invalidateQueries({ queryKey: ['schedule', leagueId] });
      queryClient.invalidateQueries({ queryKey: ['my-coins', leagueId] });
      queryClient.invalidateQueries({ queryKey: ['standings', leagueId] });
    },
    onError: (err) => {
      addToast('error', extractErrorMessage(err, 'Error al registrar el resultado'));
    },
  });

  /** Tras cambiar un resultado se mueven monedas, clasificación, estadísticas y feed. */
  function invalidateAfterResultChange() {
    queryClient.invalidateQueries({ queryKey: ['schedule', leagueId] });
    queryClient.invalidateQueries({ queryKey: ['my-coins', leagueId] });
    queryClient.invalidateQueries({ queryKey: ['standings', leagueId] });
    queryClient.invalidateQueries({ queryKey: ['season-stats', leagueId] });
    queryClient.invalidateQueries({ queryKey: ['activity', leagueId] });
  }

  const { mutate: correctResult, isPending: correcting } = useMutation({
    mutationFn: ({ matchId, winner }: { matchId: string; winner: string }) =>
      correctMatchResult(leagueId!, matchId, winner, score),
    onSuccess: () => {
      setEditingMatch(null);
      addToast('success', 'Resultado corregido');
      invalidateAfterResultChange();
    },
    onError: (err) => addToast('error', extractErrorMessage(err, 'Error al corregir el resultado')),
  });

  const { mutate: revertResult, isPending: reverting } = useMutation({
    mutationFn: (matchId: string) => revertMatchResult(leagueId!, matchId),
    onSuccess: () => {
      setEditingMatch(null);
      addToast('success', 'Resultado anulado: el partido vuelve a estar pendiente');
      invalidateAfterResultChange();
    },
    onError: (err) => addToast('error', extractErrorMessage(err, 'Error al anular el resultado')),
  });

  const editing = correcting || reverting;

  // Determine half-way point to label primera/segunda vuelta
  const totalJornadas = schedule?.jornadas?.length ?? 0;
  const halfPoint = Math.ceil(totalJornadas / 2);

  function jornadaLabel(j: JornadaDto) {
    const vuelta = j.roundNumber <= halfPoint ? 'Primera vuelta' : 'Segunda vuelta';
    return `Jornada ${j.roundNumber} · ${vuelta}`;
  }

  /** Swap window status for the active jornada — el backend es la única fuente de verdad
   *  para "abierto/cerrado" (schedule.swapWindowOpen); aquí solo se resuelven los casos
   *  que ese booleano no cubre (jornada ya completada / sin fecha de swap). */
  function swapWindowStatus(j: JornadaDto): 'open' | 'closed' | 'no-dates' | 'completed' {
    const allDone = j.matches.every((m) => m.status === 'COMPLETED');
    if (allDone) return 'completed';
    if (!j.swapDeadline) return 'no-dates';
    return schedule?.swapWindowOpen ? 'open' : 'closed';
  }

  // Active jornada = first with at least one PENDING match
  const activeJornada = schedule?.jornadas?.find(
    (j) => j.matches.some((m) => m.status === 'PENDING')
  );

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
          <div>
            <h1 className="page-title">📅 Calendario</h1>
            {league && <p className="page-subtitle">{league.name}</p>}
          </div>
          <div className="section-actions">
            {myCoins !== undefined && (
              <span className="coin-badge coin-badge-lg">💰 {myCoins.coins} monedas</span>
            )}
            <button className="btn-ghost" onClick={() => navigate(`/leagues/${leagueId}/standings`)}>
              🏆 Clasificación
            </button>
          </div>
        </div>

        {isLoading && <SkeletonTable rows={3} />}

        {!isLoading && !schedule && (
          <div className="empty-state">
            <span className="empty-state-icon">⏳</span>
            <p>El calendario se generará automáticamente al completar el draft.</p>
          </div>
        )}

        {!isLoading && schedule && schedule.jornadas.length === 0 && (
          <div className="empty-state">
            <span className="empty-state-icon">⚽</span>
            <p>No hay jornadas generadas todavía.</p>
          </div>
        )}

        {!isLoading && schedule && schedule.jornadas.length > 0 && (
          <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {schedule.jornadas.map((jornada) => {
              const isActive = jornada.roundNumber === activeJornada?.roundNumber;
              const windowStatus = isActive ? swapWindowStatus(jornada) : null;

              return (
                <div key={jornada.roundNumber} className="jornada-card">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
                    <p className="section-label" style={{ margin: 0 }}>
                      {jornadaLabel(jornada)}
                    </p>
                    {jornada.startDate && (
                      <span style={{
                        fontSize: '0.75rem',
                        color: 'var(--text-3)',
                        background: 'var(--surface-2)',
                        border: '1px solid var(--border)',
                        borderRadius: '4px',
                        padding: '0.1rem 0.4rem',
                      }}>
                        📅 {jornada.startDate}
                      </span>
                    )}
                    {windowStatus === 'open' && (
                      <span style={{
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        color: '#4ade80',
                        background: 'rgba(74,222,128,0.1)',
                        border: '1px solid rgba(74,222,128,0.3)',
                        borderRadius: '4px',
                        padding: '0.1rem 0.45rem',
                      }}>
                        🟢 Swap abierto
                      </span>
                    )}
                    {windowStatus === 'closed' && (
                      <span style={{
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        color: '#f87171',
                        background: 'rgba(248,113,113,0.1)',
                        border: '1px solid rgba(248,113,113,0.3)',
                        borderRadius: '4px',
                        padding: '0.1rem 0.45rem',
                      }}>
                        🔴 Swap cerrado
                      </span>
                    )}
                    {windowStatus === 'no-dates' && (
                      <span style={{
                        fontSize: '0.72rem',
                        color: 'var(--text-3)',
                        background: 'var(--surface-2)',
                        border: '1px solid var(--border)',
                        borderRadius: '4px',
                        padding: '0.1rem 0.45rem',
                      }}>
                        🟡 Sin fechas
                      </span>
                    )}
                  </div>

                  {isActive && jornada.swapDeadline && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginBottom: '0.6rem', display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                      <span>🗡️ Robo hasta: <strong style={{ color: 'var(--text-2)' }}>{formatDeadline(jornada.stealDeadline)}</strong></span>
                      <span>🔄 Swap hasta: <strong style={{ color: 'var(--text-2)' }}>{formatDeadline(jornada.swapDeadline)}</strong></span>
                    </div>
                  )}

                  {jornada.matches.length === 0 && (
                    <p style={{ color: 'var(--text-3)', fontSize: '0.85rem' }}>Sin partidos esta jornada.</p>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {jornada.matches.map((match) => (
                      <MatchRow
                        key={match.id}
                        match={match}
                        isAdmin={!!isAdmin}
                        onRecord={() => openRecord(match)}
                        onEdit={() => openEdit(match)}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Record result modal */}
      {pendingMatch && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>¿Quién ganó?</h2>
            <p style={{ color: 'var(--text-2)', fontSize: '0.9rem', marginBottom: '1rem' }}>
              {pendingMatch.player1} <span style={{ color: 'var(--text-3)' }}>vs</span> {pendingMatch.player2}
            </p>
            <ScoreFields
              winner={winnerScore}
              loser={loserScore}
              error={scoreError}
              onWinner={setWinnerScore}
              onLoser={setLoserScore}
            />
            <div className="modal-actions">
              <button
                className="btn-ghost"
                onClick={() => setPendingMatch(null)}
                disabled={recording}
              >
                Cancelar
              </button>
              <button
                className="btn-primary"
                disabled={recording || !!scoreError}
                onClick={() => recordResult({ matchId: pendingMatch.id, winner: pendingMatch.player1 })}
              >
                {recording ? '...' : `✓ ${pendingMatch.player1}`}
              </button>
              <button
                className="btn-primary"
                disabled={recording || !!scoreError}
                onClick={() => recordResult({ matchId: pendingMatch.id, winner: pendingMatch.player2 })}
              >
                {recording ? '...' : `✓ ${pendingMatch.player2}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Correct / undo result modal (admin) */}
      {editingMatch && (() => {
        const winner = editingMatch.winnerUsername!;
        const other = winner === editingMatch.player1 ? editingMatch.player2 : editingMatch.player1;
        const currentLabel = scoreLabel(editingMatch);
        const scoreChanged = !!score && (score.winnerScore !== editingMatch.winnerScore
          || score.loserScore !== editingMatch.loserScore);
        return (
          <div className="modal-overlay">
            <div className="modal" role="dialog" aria-label="Corregir resultado">
              <h2>Corregir resultado</h2>
              <p style={{ color: 'var(--text-2)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                {editingMatch.player1} <span style={{ color: 'var(--text-3)' }}>vs</span> {editingMatch.player2}
                {' · '}ganó <strong>{winner}</strong>{currentLabel && <> ({currentLabel})</>}
              </p>
              <p style={{ color: 'var(--text-3)', fontSize: '0.8rem', marginBottom: '1rem' }}>
                Cambiar el ganador o deshacer devuelve las monedas que dio este resultado (el saldo puede quedar en
                negativo si ya se gastaron). Cambiar solo el marcador no mueve monedas.
              </p>
              <ScoreFields
                winner={winnerScore}
                loser={loserScore}
                error={scoreError}
                onWinner={setWinnerScore}
                onLoser={setLoserScore}
              />
              <div className="modal-actions">
                <button className="btn-ghost" onClick={() => setEditingMatch(null)} disabled={editing}>
                  Cancelar
                </button>
                <button
                  className="btn-danger"
                  disabled={editing}
                  onClick={() => revertResult(editingMatch.id)}
                >
                  {reverting ? '...' : '↩ Deshacer resultado'}
                </button>
                <button
                  className="btn-ghost"
                  disabled={editing || !!scoreError || !scoreChanged}
                  title="Mismo ganador, otro marcador"
                  onClick={() => correctResult({ matchId: editingMatch.id, winner })}
                >
                  {correcting ? '...' : '✓ Guardar marcador'}
                </button>
                <button
                  className="btn-primary"
                  disabled={editing || !!scoreError}
                  onClick={() => correctResult({ matchId: editingMatch.id, winner: other })}
                >
                  {correcting ? '...' : `✓ Ganó ${other}`}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

/** Marcador opcional del modal: ganador – perdedor (los dos o ninguno). */
function ScoreFields({
  winner,
  loser,
  error,
  onWinner,
  onLoser,
}: {
  winner: string;
  loser: string;
  error: string | null;
  onWinner: (v: string) => void;
  onLoser: (v: string) => void;
}) {
  return (
    <div className="score-fields">
      <span className="score-fields-label">Marcador (opcional)</span>
      <div className="score-fields-inputs">
        <input
          type="number"
          inputMode="numeric"
          min={0}
          max={SCORE_MAX}
          aria-label="Marcador del ganador"
          placeholder="Ganador"
          value={winner}
          onChange={(e) => onWinner(e.target.value)}
          aria-invalid={!!error}
        />
        <span aria-hidden="true">–</span>
        <input
          type="number"
          inputMode="numeric"
          min={0}
          max={SCORE_MAX}
          aria-label="Marcador del perdedor"
          placeholder="Perdedor"
          value={loser}
          onChange={(e) => onLoser(e.target.value)}
          aria-invalid={!!error}
        />
      </div>
      {error && <p className="field-hint field-hint-error" role="alert">{error}</p>}
    </div>
  );
}

function formatDeadline(iso?: string): string {
  if (!iso) return '—';
  // "2026-06-04T23:59:00" → "jue 04/06 23:59"
  const d = new Date(iso);
  const days = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
  const day = days[d.getDay()];
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${day} ${dd}/${mm} ${hh}:${min}`;
}

function MatchRow({
  match,
  isAdmin,
  onRecord,
  onEdit,
}: {
  match: MatchDto;
  isAdmin: boolean;
  onRecord: () => void;
  onEdit: () => void;
}) {
  const completed = match.status === 'COMPLETED';

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        padding: '0.6rem 0.9rem',
        borderRadius: '8px',
        background: 'var(--surface-2)',
        border: '1px solid var(--border)',
      }}
    >
      {/* Player 1 */}
      <span
        style={{
          flex: 1,
          textAlign: 'right',
          fontWeight: completed && match.winnerUsername === match.player1 ? 700 : 400,
          color:
            completed && match.winnerUsername === match.player1
              ? 'var(--accent)'
              : completed && match.winnerUsername !== match.player1
              ? 'var(--text-3)'
              : 'var(--text)',
          fontSize: '0.9rem',
        }}
      >
        {completed && match.winnerUsername === match.player1 && '✓ '}
        {match.player1}
      </span>

      {/* VS / result badge */}
      <span
        style={{
          padding: '0.2rem 0.5rem',
          borderRadius: '4px',
          fontSize: '0.75rem',
          fontWeight: 600,
          background: completed ? 'rgba(74,222,128,0.1)' : 'var(--surface-3, var(--surface-2))',
          color: completed ? 'var(--green, #4ade80)' : 'var(--text-3)',
          border: `1px solid ${completed ? 'rgba(74,222,128,0.3)' : 'var(--border)'}`,
          minWidth: 36,
          textAlign: 'center',
        }}
      >
        {completed ? scoreLabel(match) ?? 'FIN' : 'vs'}
      </span>

      {/* Player 2 */}
      <span
        style={{
          flex: 1,
          fontWeight: completed && match.winnerUsername === match.player2 ? 700 : 400,
          color:
            completed && match.winnerUsername === match.player2
              ? 'var(--accent)'
              : completed && match.winnerUsername !== match.player2
              ? 'var(--text-3)'
              : 'var(--text)',
          fontSize: '0.9rem',
        }}
      >
        {completed && match.winnerUsername === match.player2 && '✓ '}
        {match.player2}
      </span>

      {/* Record button (admin, pending only) */}
      {isAdmin && !completed && (
        <button
          onClick={onRecord}
          style={{
            padding: '0.25rem 0.6rem',
            fontSize: '0.75rem',
            borderRadius: '6px',
            border: '1px solid var(--border)',
            background: 'transparent',
            color: 'var(--text-2)',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          ▶ Resultado
        </button>
      )}

      {/* Correct / undo button (admin, completed only) */}
      {isAdmin && completed && (
        <button
          onClick={onEdit}
          aria-label={`Corregir resultado ${match.player1} vs ${match.player2}`}
          style={{
            padding: '0.25rem 0.6rem',
            fontSize: '0.75rem',
            borderRadius: '6px',
            border: '1px solid var(--border)',
            background: 'transparent',
            color: 'var(--text-3)',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          ✎ Corregir
        </button>
      )}
    </div>
  );
}
