import Modal from '../../components/Modal';
import PlayShowdownModal from '../../components/schedule/PlayShowdownModal';
import LineupModal from '../../components/schedule/LineupModal';
import ImportSeriesModal from '../../components/schedule/ImportSeriesModal';
import { myLineup } from '../../utils/lineup';
import { BATTLE_DEFAULTS } from '../../utils/showdown';
import { scoreLabel, SCORE_MAX } from '../../utils/score';
import type { SchedulePageModel } from './useSchedulePage';

/** Modales del Calendario (jugar, alineación, importar, resultado, corregir). Igual en escritorio y móvil. */
export default function ScheduleModals({ model }: { model: SchedulePageModel }) {
  const {
    leagueId, username, pendingMatch, setPendingMatch, editingMatch, setEditingMatch, recordTitleId, editTitleId, winnerScore, setWinnerScore, loserScore, setLoserScore, score, scoreError, playingMatch, setPlayingMatch, lineupMatch, setLineupMatch, leagueSettings, playStatus, showdownNameOf, myPicks, importMatch, setImportMatch, importBestOf, recordResult, recording, correctResult, correcting, revertResult, reverting, editing,
  } = model;

  return (
    <>
    {playingMatch && (() => {
      const rival = playingMatch.player1 === username ? playingMatch.player2 : playingMatch.player1;
      return (
        <PlayShowdownModal
          rival={rival}
          myShowdownName={username ? showdownNameOf(username) : null}
          rivalShowdownName={showdownNameOf(rival)}
          settings={leagueSettings ?? {}}
          myPokemonNames={myLineup(playingMatch, username)?.pokemonNames ?? myPicks.map((p) => p.pokemonName)}
          status={playStatus}
          onClose={() => setPlayingMatch(null)}
        />
      );
    })()}

    {lineupMatch && leagueSettings && (
      <LineupModal
        leagueId={leagueId!}
        matchId={lineupMatch.id}
        myPicks={myPicks}
        current={myLineup(lineupMatch, username)}
        teamSheet={leagueSettings.teamSheet ?? BATTLE_DEFAULTS.teamSheet}
        onClose={() => setLineupMatch(null)}
      />
    )}

    {importMatch && (
      <ImportSeriesModal
        leagueId={leagueId!}
        match={importMatch}
        bestOf={importBestOf}
        onClose={() => setImportMatch(null)}
      />
    )}

    {/* Record result modal */}
    {pendingMatch && (
      <Modal labelledBy={recordTitleId} onClose={() => setPendingMatch(null)} canClose={!recording}>
        <h2 id={recordTitleId}>¿Quién ganó?</h2>
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
      </Modal>
    )}

    {/* Correct / undo result modal (admin) */}
    {editingMatch && (() => {
      const winner = editingMatch.winnerUsername!;
      const other = winner === editingMatch.player1 ? editingMatch.player2 : editingMatch.player1;
      const currentLabel = scoreLabel(editingMatch);
      const scoreChanged = !!score && (score.winnerScore !== editingMatch.winnerScore
        || score.loserScore !== editingMatch.loserScore);
      return (
        <Modal labelledBy={editTitleId} onClose={() => setEditingMatch(null)} canClose={!editing}>
          <h2 id={editTitleId}>Corregir resultado</h2>
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
        </Modal>
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
