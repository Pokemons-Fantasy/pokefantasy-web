import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { getMyLeagues } from '../api/leagues';
import PageHeader from '../components/PageHeader';
import { SkeletonGrid } from '../components/SkeletonGrid';

export default function MyProfilePage() {
  const username = useAuthStore((s) => s.username);
  const navigate = useNavigate();

  const { data: leagues = [], isLoading } = useQuery({
    queryKey: ['my-leagues'],
    queryFn: getMyLeagues,
    staleTime: 60_000,
  });

  return (
    <div className="page-wrapper">
      <PageHeader />

      <main className="page-content">

        {/* ── Hero ── */}
        <div className="animate-in" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', marginBottom: '2rem' }}>
          <div style={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            background: 'var(--accent-dim)',
            border: '2px solid var(--accent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.75rem',
            fontWeight: 800,
            color: 'var(--accent)',
            flexShrink: 0,
          }}>
            {username?.[0]?.toUpperCase()}
          </div>
          <div>
            <h1 className="page-title" style={{ marginBottom: '0.15rem' }}>{username}</h1>
            <p className="page-subtitle">
              {leagues.length} {leagues.length === 1 ? 'liga' : 'ligas'}
            </p>
          </div>
        </div>

        {/* ── Ligas ── */}
        <p className="section-label" style={{ marginBottom: '0.75rem' }}>Mis ligas</p>

        {isLoading && <SkeletonGrid />}

        {!isLoading && leagues.length === 0 && (
          <div className="empty-state">
            <span className="empty-state-icon">🏆</span>
            <p>No perteneces a ninguna liga todavía.</p>
          </div>
        )}

        {!isLoading && leagues.length > 0 && (
          <div className="cards-grid animate-in">
            {leagues.map((league) => (
              <div
                key={league.id}
                className="card"
                style={{ cursor: 'pointer' }}
                onClick={() => navigate(`/leagues/${league.id}`)}
              >
                <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '0.5rem' }}>
                  {league.name}
                </div>
                <span className={`badge ${league.status === 'ACTIVE' ? 'badge-green' : 'badge-yellow'}`}>
                  {league.status === 'ACTIVE' ? 'Activa' : 'Configuración'}
                </span>
              </div>
            ))}
          </div>
        )}

      </main>
    </div>
  );
}
