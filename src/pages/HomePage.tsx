import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useQuery } from '@tanstack/react-query';
import { getMyLeagues } from '../api/leagues';
import PendingTradesBanner from '../components/PendingTradesBanner';
import PageHeader from '../components/PageHeader';
import { homeFocus, leaguePhase } from '../utils/leaguePhase';

const FOCUS_CARDS = {
  draft: {
    live: true, icon: '⚡', title: 'Draft en curso', path: '/draft', cta: 'Ir al draft',
    single: 'ir directamente al draft.',
    many: (n: number) => `${n} ligas con draft en curso.`,
  },
  setup: {
    live: false, icon: '🎯', title: 'Continuar setup', path: '', cta: 'Continuar',
    single: 'nominar Pokémon y arrancar.',
    many: () => 'Continúa preparando tus ligas.',
  },
  season: {
    live: false, icon: '📅', title: 'Temporada en curso', path: '/schedule', cta: 'Ver calendario',
    single: 'consulta la jornada y la clasificación.',
    many: (n: number) => `${n} ligas en temporada.`,
  },
} as const;

export default function HomePage() {
  const username = useAuthStore((s) => s.username);
  const navigate = useNavigate();

  const { data: leagues = [] } = useQuery({
    queryKey: ['my-leagues'],
    queryFn: getMyLeagues,
  });

  const activeLeagues = leagues.filter((l) => ['draft', 'season'].includes(leaguePhase(l.draftStatus)));
  const focus = homeFocus(leagues);
  const card = focus && FOCUS_CARDS[focus.phase];
  const single = focus?.leagues.length === 1 ? focus.leagues[0] : null;

  // Una liga en esa fase → directo a su pantalla; varias → lista de ligas
  const handleFocusNav = () => {
    navigate(single && card ? `/leagues/${single.id}${card.path}` : '/leagues');
  };

  return (
    <div className="page-wrapper">
      <PageHeader />

      <main className="page-content">
        <PendingTradesBanner />

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
                <span className="stat-pill-value" style={{ color: 'var(--success)' }}>
                  {activeLeagues.length}
                </span>
                <span className="stat-pill-label">Activa{activeLeagues.length !== 1 ? 's' : ''}</span>
              </div>
            )}
          </div>
        )}

        {/* Navigation cards */}
        <div className="nav-cards stagger">

          {/* ── Mis ligas ── always shown, gold accent */}
          <button className="nav-card nav-card-gold" onClick={() => navigate('/leagues')}>
            <div className="nav-card-icon nav-card-icon-gold">🏆</div>
            <h3>Mis ligas</h3>
            <p>Ver ligas activas, gestionar miembros y acceder al draft.</p>
            <span className="nav-card-arrow">Ver ligas <span>→</span></span>
          </button>

          {/* ── Fase destacada: draft en curso > setup > temporada ── */}
          {focus && card && (
            <button className={`nav-card ${card.live ? 'nav-card-live' : 'nav-card-setup'}`} onClick={handleFocusNav}>
              {card.live && <span className="nav-card-live-dot" aria-hidden="true" />}

              <div className={`nav-card-icon ${card.live ? 'nav-card-icon-green' : 'nav-card-icon-blue'}`}>
                {card.icon}
              </div>

              <h3>
                {card.title}
                {focus.leagues.length > 1 && <span className="nav-card-count">{focus.leagues.length}</span>}
              </h3>

              <p>
                {single
                  ? <><strong style={{ color: 'var(--text)' }}>{single.name}</strong> — {card.single}</>
                  : card.many(focus.leagues.length)}
              </p>

              <span className={`nav-card-arrow ${card.live ? 'nav-card-arrow-green' : 'nav-card-arrow-blue'}`}>
                {card.cta} <span>→</span>
              </span>
            </button>
          )}

          {/* ── Cómo funciona ── static / info */}
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
