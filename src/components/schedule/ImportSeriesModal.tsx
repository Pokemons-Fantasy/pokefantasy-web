import { useId, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getReplayCandidates, importSeries, type MatchDto, type ReplayCandidate } from '../../api/leagues';
import { useToastStore } from '../../store/toastStore';
import { extractErrorMessage } from '../../utils/errorMessage';
import { groupBySeries, seriesSummary } from '../../utils/replays';
import { SkeletonTable } from '../SkeletonTable';
import Modal from '../Modal';

interface ImportSeriesModalProps {
  leagueId: string;
  match: MatchDto;
  /** Partidas de la serie según la liga (1 o 3). */
  bestOf: number;
  onClose: () => void;
}

function gameLabel(c: ReplayCandidate): string {
  const winner = `${c.winnerUsername ?? '?'} gana`;
  return c.gameNumber ? `Partida ${c.gameNumber}: ${winner}` : winner;
}

/**
 * Registrar el resultado marcando los replays de Showdown de la serie. El backend dice qué replays valen y vuelve
 * a validarlo todo al importar; aquí solo se guía (resumen en vivo con las mismas reglas).
 */
export default function ImportSeriesModal({ leagueId, match, bestOf, onClose }: ImportSeriesModalProps) {
  const titleId = useId();
  const queryClient = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);
  const [selected, setSelected] = useState<string[]>([]);
  const [pasted, setPasted] = useState<ReplayCandidate[]>([]);
  const [url, setUrl] = useState('');

  // Cada carga son hasta 16 peticiones a Showdown: nada de recargar al volver de "Ver replay" ni reintentar solo.
  const { data: found, isLoading, error, refetch } = useQuery({
    queryKey: ['replay-candidates', leagueId, match.id],
    queryFn: () => getReplayCandidates(leagueId, match.id),
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    retry: false,
  });
  const candidates = [...(found ?? []), ...pasted.filter((p) => !(found ?? []).some((f) => f.id === p.id))];
  const groups = groupBySeries(candidates);
  const chosen = candidates.filter((c) => selected.includes(c.id));
  const summary = seriesSummary(chosen, bestOf);
  const warnings = [...new Set(chosen.flatMap((c) => c.warnings ?? []))];

  const add = useMutation({
    mutationFn: () => getReplayCandidates(leagueId, match.id, url.trim()),
    onSuccess: (more) => { setPasted((p) => [...p, ...more]); setUrl(''); },
    onError: (err) => addToast('error', extractErrorMessage(err, 'No se pudo leer el replay')),
  });

  const submit = useMutation({
    mutationFn: () => importSeries(leagueId, match.id, candidates.filter((c) => selected.includes(c.id)).map((c) => c.id)),
    onSuccess: () => {
      for (const key of ['schedule', 'my-coins', 'standings', 'season-stats', 'activity']) {
        queryClient.invalidateQueries({ queryKey: [key, leagueId] });
      }
      addToast('success', 'Resultado registrado');
      onClose();
    },
    onError: (err) => addToast('error', extractErrorMessage(err, 'No se pudo registrar el resultado')),
  });

  const toggle = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const markSeries = (games: ReplayCandidate[]) => setSelected(games.filter((g) => g.selectable).map((g) => g.id));

  function gameRow(c: ReplayCandidate) {
    const id = `replay-${c.id}`;
    const reasonId = `${id}-reason`;
    return (
      <li key={c.id} className="import-game">
        <label htmlFor={id}>
          <input
            id={id}
            type="checkbox"
            checked={selected.includes(c.id)}
            disabled={!c.selectable || submit.isPending}
            onChange={() => toggle(c.id)}
            aria-describedby={c.selectable ? undefined : reasonId}
          />
          {gameLabel(c)}
        </label>
        <a href={c.url} target="_blank" rel="noopener noreferrer" className="import-game-link">Ver replay</a>
        {!c.selectable && <span id={reasonId} className="field-hint">{c.reason}</span>}
      </li>
    );
  }

  return (
    <Modal labelledBy={titleId} onClose={onClose} canClose={!submit.isPending} className="import-series">
      <h2 id={titleId}>Importar de Showdown</h2>
      <p className="field-hint">
        {match.player1} vs {match.player2} · {bestOf === 1 ? 'una partida' : 'al mejor de 3'}
      </p>

      {isLoading && <SkeletonTable rows={3} />}
      {error && (
        <div className="field-hint field-hint-error" role="alert">
          {extractErrorMessage(error, 'No se pudieron buscar los replays')}{' '}
          <button type="button" className="btn-ghost" onClick={() => refetch()}>Reintentar</button>
        </div>
      )}
      {!isLoading && !error && candidates.length === 0 && (
        <p className="field-hint">
          No hay replays de esta semana entre los dos. ¿Los subisteis con «Upload and share replay»? Si son privados,
          pega el enlace.
        </p>
      )}

      {groups.map((g) => g.seriesId ? (
        <fieldset key={g.seriesId} className="import-series-group">
          <legend>Serie</legend>
          <ul>{g.games.map(gameRow)}</ul>
          <button type="button" className="btn-ghost" onClick={() => markSeries(g.games)} disabled={submit.isPending}>
            Marcar la serie
          </button>
        </fieldset>
      ) : (
        <ul key={g.games[0].id} className="import-series-loose">{g.games.map(gameRow)}</ul>
      ))}

      <form
        className="import-series-paste"
        onSubmit={(e) => { e.preventDefault(); if (url.trim()) add.mutate(); }}
      >
        <label htmlFor="import-replay-url">¿No aparece? Pega el enlace del replay</label>
        <div className="config-inline">
          <input
            id="import-replay-url"
            type="url"
            className="search-input"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://replay.pokemonshowdown.com/..."
          />
          <button type="submit" className="btn-ghost" disabled={!url.trim() || add.isPending}>Añadir</button>
        </div>
      </form>

      {chosen.length > 0 && (
        <p className={'error' in summary ? 'field-hint field-hint-error' : 'import-series-summary'} aria-live="polite">
          {'error' in summary ? summary.error : `Resultado: ${summary.winner} gana${summary.score ? ` ${summary.score}` : ''}`}
        </p>
      )}
      {warnings.length > 0 && (
        <ul className="match-lineup-warnings">{warnings.map((w) => <li key={w}>{w}</li>)}</ul>
      )}

      <div className="modal-actions">
        <button type="button" className="btn-ghost" onClick={onClose} disabled={submit.isPending}>Cancelar</button>
        <button
          type="button"
          className="btn-primary"
          disabled={chosen.length === 0 || 'error' in summary || submit.isPending}
          onClick={() => submit.mutate()}
        >
          Registrar resultado
        </button>
      </div>
    </Modal>
  );
}
