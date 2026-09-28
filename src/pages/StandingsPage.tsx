import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { getStandings } from '../api/leagues';
import type { PlayerStanding } from '../api/leagues';
import { SkeletonTable } from '../components/SkeletonTable';
import UserAvatar from '../components/avatar/UserAvatar';
import { formatDiff } from '../utils/score';

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

  // La columna "Dif" solo aparece cuando algún partido tiene marcador.
  const hasScores = !!standings?.some((s) => s.scoreFor > 0 || s.scoreAgainst > 0);

  return (
    <>
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
          <div className="picks-table-container animate-in">
            <table className="picks-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th style={{ width: 40, textAlign: 'center' }}>Pos</th>
                  <th>Jugador</th>
                  <th style={{ textAlign: 'center' }}>PJ</th>
                  <th style={{ textAlign: 'center' }}>V</th>
                  <th style={{ textAlign: 'center' }}>D</th>
                  {hasScores && <th style={{ textAlign: 'center' }} title="Diferencia de marcador (desempata tras las victorias)">Dif</th>}
                  <th style={{ textAlign: 'right' }}>Monedas</th>
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
                    to={`/leagues/${leagueId}/players/${row.username}`}
                    onNavigate={() => navigate(`/leagues/${leagueId}/players/${row.username}`)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </>
  );
}

function StandingRow({
  row,
  pos,
  isMe,
  showDiff,
  to,
  onNavigate,
}: {
  row: PlayerStanding;
  pos: number;
  isMe: boolean;
  showDiff: boolean;
  to: string;
  onNavigate: () => void;
}) {
  const posLabel = pos === 1 ? '🥇' : pos === 2 ? '🥈' : pos === 3 ? '🥉' : String(pos);

  return (
    <tr
      style={
        isMe
          ? {
              background: 'var(--accent-dim)',
              outline: '1px solid var(--accent)',
              outlineOffset: '-1px',
              cursor: 'pointer',
            }
          : { cursor: 'pointer' }
      }
      onClick={onNavigate}
    >
      <td style={{ textAlign: 'center', fontSize: pos <= 3 ? '1.1rem' : '0.9rem' }}>
        {posLabel}
      </td>
      <td style={{ fontWeight: isMe ? 700 : 500 }}>
        <Link to={to} className="row-link" onClick={(e) => e.stopPropagation()}>
          <UserAvatar username={row.username} size={24} className="avatar-inline" />
          {row.username}
        </Link>
        {isMe && (
          <span
            style={{
              marginLeft: '0.5rem',
              fontSize: '0.65rem',
              fontWeight: 700,
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              color: 'var(--accent)',
              background: 'var(--accent-dim)',
              padding: '0.1rem 0.4rem',
              borderRadius: 4,
            }}
          >
            tú
          </span>
        )}
      </td>
      <td style={{ textAlign: 'center', color: 'var(--text-3)' }}>{row.played}</td>
      <td style={{ textAlign: 'center', color: row.wins > 0 ? 'var(--success)' : 'var(--text-3)', fontWeight: row.wins > 0 ? 600 : 400 }}>
        {row.wins}
      </td>
      <td style={{ textAlign: 'center', color: row.losses > 0 ? 'var(--danger)' : 'var(--text-3)', fontWeight: row.losses > 0 ? 600 : 400 }}>
        {row.losses}
      </td>
      {showDiff && (
        <td
          style={{ textAlign: 'center', fontFamily: "'Space Mono', monospace", fontSize: '0.85rem',
            color: row.scoreDiff > 0 ? 'var(--success)' : row.scoreDiff < 0 ? 'var(--danger)' : 'var(--text-3)' }}
          title={`${row.scoreFor} a favor, ${row.scoreAgainst} en contra`}
        >
          {formatDiff(row.scoreDiff)}
        </td>
      )}
      <td style={{ textAlign: 'right' }}>
        <span className="coin-badge" style={{ fontSize: '0.75rem' }}>
          💰 {row.coins}
        </span>
      </td>
    </tr>
  );
}
