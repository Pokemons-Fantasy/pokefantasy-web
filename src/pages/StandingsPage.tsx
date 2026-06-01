import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { getStandings, getLeagueDetail } from '../api/leagues';
import type { PlayerStanding } from '../api/leagues';
import { SkeletonTable } from '../components/SkeletonTable';
import PageHeader from '../components/PageHeader';

export default function StandingsPage() {
  const { leagueId } = useParams<{ leagueId: string }>();
  const username = useAuthStore((s) => s.username);
  const navigate = useNavigate();

  const { data: league } = useQuery({
    queryKey: ['league-detail', leagueId],
    queryFn: () => getLeagueDetail(leagueId!),
    enabled: !!leagueId,
    staleTime: 60_000,
  });

  const { data: standings, isLoading } = useQuery({
    queryKey: ['standings', leagueId],
    queryFn: () => getStandings(leagueId!),
    enabled: !!leagueId,
    staleTime: 60_000,
  });

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
            <h1 className="page-title">🏆 Clasificación</h1>
            {league && <p className="page-subtitle">{league.name}</p>}
          </div>
          <div className="section-actions">
            <button className="btn-ghost" onClick={() => navigate(`/leagues/${leagueId}/schedule`)}>
              📅 Calendario
            </button>
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
                    onNavigate={() => navigate(`/leagues/${leagueId}/players/${row.username}`)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}

function StandingRow({
  row,
  pos,
  isMe,
  onNavigate,
}: {
  row: PlayerStanding;
  pos: number;
  isMe: boolean;
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
        {row.username}
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
      <td style={{ textAlign: 'center', color: row.wins > 0 ? 'var(--green)' : 'var(--text-3)', fontWeight: row.wins > 0 ? 600 : 400 }}>
        {row.wins}
      </td>
      <td style={{ textAlign: 'center', color: row.losses > 0 ? '#f87171' : 'var(--text-3)', fontWeight: row.losses > 0 ? 600 : 400 }}>
        {row.losses}
      </td>
      <td style={{ textAlign: 'right' }}>
        <span className="coin-badge" style={{ fontSize: '0.75rem' }}>
          💰 {row.coins}
        </span>
      </td>
    </tr>
  );
}
