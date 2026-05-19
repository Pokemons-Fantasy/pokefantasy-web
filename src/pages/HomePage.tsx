import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useQuery } from '@tanstack/react-query';
import { getMyLeagues } from '../api/leagues';

export default function HomePage() {
  const username = useAuthStore((s) => s.username);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  const { data: leagues = [] } = useQuery({
    queryKey: ['my-leagues'],
    queryFn: getMyLeagues,
  });

  const activeLeagues = leagues.filter((l) => l.status === 'ACTIVE');

  // Navigate directly to the draft if there is exactly one active league,
  // otherwise go to the leagues list so the user can pick
  const handleDraftNav = () => {
    if (activeLeagues.length === 1) {
      navigate(`/leagues/${activeLeagues[0].id}/draft`);
    } else {
      navigate('/leagues');
    }
  };

  return (
    <div className="page-wrapper">
      <header className="page-header">
        <div className="page-header-inner">
          <span className="logo">PokeFantasy</span>
          <div className="header-right">
            <span className="header-user">Hola, <strong>{username}</strong></span>
            <button className="btn-ghost" onClick={logout}>Cerrar sesión</button>
          </div>
        </div>
      </header>

      <main className="page-content">
        {/* Hero */}
        <section className="hero-section animate-in">
          <div className="hero-eyebrow">Pokémon Fantasy League</div>
          <h1 className="hero-title">
            Bienvenido,<br />
            <span className="accent">{username}</span>
          </h1>
          <p className="hero-subtitle">
            Nomina, draftea y compite con tus Pokémon favoritos en ligas privadas con amigos.
          </p>

          {/* Pokéball decoration */}
          <svg className="hero-ball" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <circle cx="50" cy="50" r="48" fill="none" stroke="white" strokeWidth="1.5"/>
            <line x1="2" y1="50" x2="98" y2="50" stroke="white" strokeWidth="1.5"/>
            <circle cx="50" cy="50" r="12" fill="none" stroke="white" strokeWidth="1.5"/>
            <circle cx="50" cy="50" r="6" fill="white"/>
          </svg>
        </section>

        {/* Stat pills */}
        {leagues.length > 0 && (
          <div className="stat-pills animate-in" style={{ animationDelay: '0.1s' }}>
            <div className="stat-pill">
              <span className="stat-pill-value">{leagues.length}</span>
              <span className="stat-pill-label">{leagues.length === 1 ? 'Liga' : 'Ligas'}</span>
            </div>
            {activeLeagues.length > 0 && (
              <div className="stat-pill">
                <span className="stat-pill-value" style={{ color: 'var(--green)' }}>
                  {activeLeagues.length}
                </span>
                <span className="stat-pill-label">Activa{activeLeagues.length !== 1 ? 's' : ''}</span>
              </div>
            )}
          </div>
        )}

        {/* Navigation cards */}
        <div className="nav-cards stagger">

          {/* ── Mis ligas (yellow/gold — home base) ── */}
          <button className="nav-card" onClick={() => navigate('/leagues')}>
            <div className="nav-card-icon">🏆</div>
            <h3>Mis ligas</h3>
            <p>Ver ligas activas, gestionar miembros y acceder al draft.</p>
            <span className="nav-card-arrow">Ver ligas <span>→</span></span>
          </button>

          {/* ── Draft activo (green — live/urgent, only when relevant) ── */}
          {activeLeagues.length > 0 && (
            <button className="nav-card nav-card-live" onClick={handleDraftNav}>
              {/* Pulsing live indicator */}
              <span className="nav-card-live-dot" aria-hidden="true" />

              <div className="nav-card-icon nav-card-icon-green">⚡</div>
              <h3>
                Draft activo
                {activeLeagues.length > 1 && (
                  <span className="nav-card-count">{activeLeagues.length}</span>
                )}
              </h3>
              <p>
                {activeLeagues.length === 1
                  ? <>Liga <strong style={{ color: 'var(--text)' }}>{activeLeagues[0].name}</strong> — draft en curso.</>
                  : `${activeLeagues.length} ligas con draft en curso.`}
              </p>
              <span className="nav-card-arrow nav-card-arrow-green">
                Ir al draft <span>→</span>
              </span>
            </button>
          )}

          {/* ── Cómo funciona (static/info) ── */}
          <div className="nav-card card-static" style={{ cursor: 'default' }}>
            <div className="nav-card-icon">📖</div>
            <h3>Cómo funciona</h3>
            <p>Crea una liga → nomina Pokémon → draftea → ¡compite!</p>
            <span className="nav-card-arrow" style={{ color: 'var(--text-3)' }}>3 pasos</span>
          </div>

        </div>
      </main>
    </div>
  );
}
