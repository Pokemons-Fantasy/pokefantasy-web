import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { getSchedule, getStandings } from '../api/leagues';
import { SkeletonTable } from '../components/SkeletonTable';
import StandingRow from '../components/standings/StandingRow';
import { recentForm, tiebreaks } from '../utils/standings';

export default function StandingsPage() {
  const { leagueId } = useParams<{ leagueId: string }>();
  const username = useAuthStore((s) => s.username);
  const navigate = useNavigate();

  const { data: standings, isLoading } = useQuery({
    queryKey: ['standings', leagueId],
    queryFn: () => getStandings(leagueId!),
    enabled: !!leagueId,
    staleTime: 60_000,
  });

  // Misma caché que el calendario: la racha de cada jugador sale de ahí.
  const { data: schedule } = useQuery({
    queryKey: ['schedule', leagueId],
    queryFn: () => getSchedule(leagueId!),
    enabled: !!leagueId,
    staleTime: 30_000,
  });

  // La columna "Dif" solo aparece cuando algún partido tiene marcador.
  const hasScores = !!standings?.some((s) => s.scoreFor > 0 || s.scoreAgainst > 0);
  const decisive = useMemo(() => tiebreaks(standings ?? []), [standings]);
  const hasTies = decisive.size > 0;

  return (
    <main className="page-content">
      <div className="section-header">
        <div>
          <h1 className="page-title">🏆 Clasificación</h1>
        </div>
      </div>

      {isLoading && <SkeletonTable rows={4} />}

      {!isLoading && standings && standings.length === 0 && (
        <div className="empty-state">
          <span className="empty-state-icon">📊</span>
          <p>No hay partidos registrados todavía.</p>
        </div>
      )}

      {!isLoading && standings && standings.length > 0 && (
        <>
          <div className="picks-table-container animate-in">
            <table className="picks-table standings-table">
              <colgroup>
                <col className="col-pos" />
                <col />
                <col className="col-num col-played" />
                <col className="col-num" />
                <col className="col-num" />
                {hasScores && <col className="col-diff" />}
                <col className="col-coins" />
              </colgroup>
              <thead>
                <tr>
                  <th className="standing-pos-cell" scope="col"><abbr title="Posición">Pos</abbr></th>
                  <th scope="col">Jugador</th>
                  <th className="standing-num standing-played" scope="col"><abbr title="Partidos jugados">PJ</abbr></th>
                  <th className="standing-num" scope="col"><abbr title="Victorias">V</abbr></th>
                  <th className="standing-num" scope="col"><abbr title="Derrotas">D</abbr></th>
                  {hasScores && (
                    <th className="standing-num" scope="col">
                      <abbr title="Diferencia de marcador">Dif</abbr>
                    </th>
                  )}
                  <th className="standing-num" scope="col">
                    <span className="th-long">Monedas</span>
                    <span className="th-short" aria-hidden="true">💰</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {standings.map((row, i) => (
                  <StandingRow
                    key={row.username}
                    row={row}
                    pos={i + 1}
                    isMe={row.username === username}
                    showDiff={hasScores}
                    decisive={decisive.get(row.username)}
                    form={recentForm(schedule, row.username)}
                    to={`/leagues/${leagueId}/players/${row.username}`}
                    onNavigate={() => navigate(`/leagues/${leagueId}/players/${row.username}`)}
                  />
                ))}
              </tbody>
            </table>
          </div>
          {hasTies && (
            <p className="standings-legend">
              Con las mismas victorias decide la diferencia de marcador; si sigue igual, las monedas y, por último,
              el nombre. <span className="standing-decisive">Resaltado</span>, el dato que ha decidido cada empate.
            </p>
          )}
        </>
      )}
    </main>
  );
}
