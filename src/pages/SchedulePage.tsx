import { useEffect, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
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
import { formatDay } from '../utils/dates';
import { jornadaStates, nextMatchFor } from '../utils/schedule';
import { SkeletonTable } from '../components/SkeletonTable';
import MarketStatus from '../components/teams/MarketStatus';
import JornadaCard from '../components/schedule/JornadaCard';

export default function SchedulePage() {
  const { leagueId } = useParams<{ leagueId: string }>();
  const username = useAuthStore((s) => s.username);
  const queryClient = useQueryClient();

  const addToast = useToastStore((s) => s.addToast);
  const [pendingMatch, setPendingMatch] = useState<MatchDto | null>(null);
  const [editingMatch, setEditingMatch] = useState<MatchDto | null>(null);
  // Jornadas jugadas desplegadas (van plegadas por defecto)
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
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

  const jornadas = schedule?.jornadas ?? [];
  const states = jornadaStates(jornadas);
  const currentIndex = states.indexOf('current');
  const next = nextMatchFor(jornadas, username);

  // Mitad del calendario para etiquetar primera / segunda vuelta
  const halfPoint = Math.ceil(jornadas.length / 2);

  function jornadaLabel(j: JornadaDto) {
    const vuelta = j.roundNumber <= halfPoint ? 'Primera vuelta' : 'Segunda vuelta';
    return `Jornada ${j.roundNumber} · ${vuelta}`;
  }

  function toggleJornada(roundNumber: number) {
    setExpanded((prev) => {
      const nextSet = new Set(prev);
      if (nextSet.has(roundNumber)) nextSet.delete(roundNumber);
      else nextSet.add(roundNumber);
      return nextSet;
    });
  }

  // Al llegar, se lleva la jornada actual a la vista (una sola vez; 'nearest' no mueve si ya se ve)
  const currentRef = useRef<HTMLElement>(null);
  const scrolledToCurrent = useRef(false);
  useEffect(() => {
    const el = currentRef.current;
    if (!el || scrolledToCurrent.current) return;
    scrolledToCurrent.current = true;
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    el.scrollIntoView?.({ block: 'nearest', behavior: reduceMotion ? 'auto' : 'smooth' });
  }, [currentIndex]);

  return (
    <>
      <main className="page-content">
        <div className="section-header">
          <div>
            <h1 className="page-title">📅 Calendario</h1>
          </div>
          <div className="section-actions">
            {myCoins !== undefined && (
              <span className="coin-badge coin-badge-lg">💰 {myCoins.coins} monedas</span>
            )}
          </div>
        </div>

        {isLoading && <SkeletonTable rows={3} />}

        {!isLoading && !schedule && (
          <div className="empty-state">
            <span className="empty-state-icon">⏳</span>
            <p>El calendario se generará automáticamente al completar el draft.</p>
          </div>
        )}

        {!isLoading && schedule && jornadas.length === 0 && (
          <div className="empty-state">
            <span className="empty-state-icon">⚽</span>
            <p>No hay jornadas generadas todavía.</p>
          </div>
        )}

        {!isLoading && schedule && jornadas.length > 0 && (
          <div className="schedule animate-in">
            <MarketStatus schedule={schedule} />

            {next && (
              <div className="next-match">
                <span className="next-match-label">Tu próximo partido</span>
                <strong>
                  Jornada {next.jornada.roundNumber} · contra {next.opponent}
                  {next.jornada.startDate && ` · ${formatDay(next.jornada.startDate)}`}
                </strong>
              </div>
            )}

            {jornadas.map((jornada, i) => (
              <JornadaCard
                key={jornada.roundNumber}
                ref={i === currentIndex ? currentRef : undefined}
                jornada={jornada}
                state={states[i]}
                label={jornadaLabel(jornada)}
                username={username}
                isAdmin={!!isAdmin}
                expanded={expanded.has(jornada.roundNumber)}
                onToggle={() => toggleJornada(jornada.roundNumber)}
                onRecord={openRecord}
                onEdit={openEdit}
              />
            ))}
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
    </>
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
