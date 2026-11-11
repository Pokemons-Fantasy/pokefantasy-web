import { SkeletonTable } from '../../components/SkeletonTable';
import MarketStatus from '../../components/teams/MarketStatus';
import JornadaCard from '../../components/schedule/JornadaCard';
import { formatDay } from '../../utils/dates';
import { coinsLabel } from '../../utils/coins';
import type { SchedulePageModel } from './useSchedulePage';

/** Calendario en escritorio: mercado, tu próximo partido y todas las jornadas en una columna. */
export default function ScheduleDesktopView({ model }: { model: SchedulePageModel }) {
  const {
    username, expanded, openRecord, openEdit, schedule, isLoading, myCoins, isAdmin, setPlayingMatch, spriteByName, openLineup, openImport, jornadas, states, currentIndex, next, jornadaLabel, toggleJornada, currentRef,
  } = model;

  return (
    <main className="page-content">
      <div className="section-header">
        <div>
          <h1 className="page-title">📅 Calendario</h1>
        </div>
        <div className="section-actions">
          {myCoins !== undefined && (
            <span className="coin-badge coin-badge-lg">💰 {coinsLabel(myCoins.coins)}</span>
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
              onPlay={setPlayingMatch}
              onLineup={openLineup}
              onImport={openImport}
              spriteByName={spriteByName}
            />
          ))}
        </div>
      )}
    </main>
  );
}
