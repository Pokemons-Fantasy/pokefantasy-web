import { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SkeletonTable } from '../../components/SkeletonTable';
import ChipTabs from '../../components/shell/ChipTabs';
import JornadaMatches from '../../components/schedule/JornadaMatches';
import { formatDay } from '../../utils/dates';
import { mineFirst, resolveJornada } from '../../utils/scheduleView';
import type { SchedulePageModel } from './useSchedulePage';
import styles from './ScheduleMobileView.module.css';

/** Calendario en móvil: tira de jornadas y una jornada cada vez, con tu partido primero. */
export default function ScheduleMobileView({ model }: { model: SchedulePageModel }) {
  const {
    isLoading, schedule, jornadas, states, next, jornadaLabel, username, isAdmin,
    openRecord, openEdit, setPlayingMatch, openLineup, openImport, spriteByName,
  } = model;
  const [params, setParams] = useSearchParams();
  const selectJornada = (n: number) => setParams((prev) => {
    prev.set('jornada', String(n));
    return prev;
  }, { replace: true });

  // "Ver" desmonta el aviso que tenía el foco: se lleva a la chip de la jornada elegida en cuanto se pinta
  const focusOnSelect = useRef<number | null>(null);

  const selected = resolveJornada(jornadas, params.get('jornada'));
  const jornada = jornadas.find((j) => j.roundNumber === selected);
  useEffect(() => {
    if (focusOnSelect.current === null || focusOnSelect.current !== selected) return;
    focusOnSelect.current = null;
    document.getElementById(`jornadas-tab-${selected}`)?.focus();
  }, [selected]);
  // Solo quien aparece en el calendario "juega" o "descansa"; un admin que no juega solo ve los partidos
  const plays = !!username && jornadas.some((j) => j.matches.some((m) => m.player1 === username || m.player2 === username));

  const matchProps = {
    username,
    isAdmin: !!isAdmin,
    onRecord: openRecord,
    onEdit: openEdit,
    onPlay: setPlayingMatch,
    onLineup: openLineup,
    onImport: openImport,
    spriteByName,
  };

  return (
    <main className={`page-content ${styles.page}`}>
      <h1 className="sr-only">Calendario</h1>

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

      {!isLoading && jornada && (
        <>
          <ChipTabs
            label="Jornadas"
            idPrefix="jornadas"
            options={jornadas.map((j, i) => ({
              value: j.roundNumber,
              label: `J${j.roundNumber}`,
              ariaLabel: `Jornada ${j.roundNumber}${states[i] === 'played' ? ', jugada' : states[i] === 'current' ? ', actual' : ''}`,
            }))}
            value={jornada.roundNumber}
            onChange={selectJornada}
          />

          {next && next.jornada.roundNumber !== jornada.roundNumber && (
            <p className={styles.notice}>
              <span>Tu próximo partido: J{next.jornada.roundNumber} vs {next.opponent}</span>
              <button
                type="button"
                className="btn-ghost"
                onClick={() => { focusOnSelect.current = next.jornada.roundNumber; selectJornada(next.jornada.roundNumber); }}
              >
                Ver
              </button>
            </p>
          )}

          <section
            id="jornadas-panel"
            role="tabpanel"
            aria-labelledby={`jornadas-tab-${jornada.roundNumber}`}
            className={styles.panel}
          >
            <p className={styles.meta}>
              {jornadaLabel(jornada)}
              {jornada.startDate && ` · ${formatDay(jornada.startDate)}`}
            </p>
            <JornadaView jornada={jornada} plays={plays} matchProps={matchProps} />
          </section>
        </>
      )}
    </main>
  );
}

type MatchProps = Omit<Parameters<typeof JornadaMatches>[0], 'matches' | 'jornada' | 'id' | 'emptyText'>;

function JornadaView({ jornada, plays, matchProps }: {
  jornada: NonNullable<SchedulePageModel['jornadas']>[number];
  plays: boolean;
  matchProps: MatchProps;
}) {
  const { mine, others } = mineFirst(jornada.matches, matchProps.username);
  return (
    <>
      {mine && (
        <div className={styles.mine}>
          <h2 className={styles.label}>Tu partido</h2>
          <JornadaMatches matches={[mine]} jornada={jornada} {...matchProps} />
        </div>
      )}
      {!mine && plays && <p className={styles.rest}>Descansas esta jornada</p>}
      <JornadaMatches matches={others} jornada={jornada} {...matchProps} emptyText={mine ? undefined : 'Sin partidos esta jornada.'} />
    </>
  );
}
