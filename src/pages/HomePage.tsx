import { Link } from 'react-router-dom';
import { useQueries, useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import { getMyLeagues, getSchedule } from '../api/leagues';
import { getDraftStatus } from '../api/pokemons';
import PendingTradesBanner from '../components/PendingTradesBanner';
import PageHeader from '../components/PageHeader';
import HomeLeagueCard from '../components/home/HomeLeagueCard';
import PushPrompt from '../components/push/PushPrompt';
import { SkeletonGrid } from '../components/SkeletonGrid';
import { leaguePhase } from '../utils/leaguePhase';
import { leaguesByUrgency } from '../utils/home';

/** Ligas que caben en la home; el resto, en "Ver todas". */
const HOME_LEAGUES = 4;

export default function HomePage() {
  const username = useAuthStore((s) => s.username) ?? '';

  const { data: leagues = [], isLoading } = useQuery({
    queryKey: ['my-leagues'],
    queryFn: getMyLeagues,
    staleTime: 60_000,
  });

  const shown = leaguesByUrgency(leagues).slice(0, HOME_LEAGUES);
  const inSeason = shown.filter((l) => leaguePhase(l.draftStatus) === 'season');
  const drafting = shown.filter((l) => leaguePhase(l.draftStatus) === 'draft');

  // Mismas claves que Calendario/Equipos y el draft: la caché se comparte entre pantallas.
  const schedules = useQueries({
    queries: inSeason.map((l) => ({
      queryKey: ['schedule', l.id],
      queryFn: () => getSchedule(l.id),
      staleTime: 30_000,
    })),
  });
  const drafts = useQueries({
    queries: drafting.map((l) => ({
      queryKey: ['draft-status', l.id],
      queryFn: () => getDraftStatus(l.id),
      staleTime: 15_000,
    })),
  });
  const scheduleOf = new Map(inSeason.map((l, i) => [l.id, schedules[i]?.data]));
  const draftOf = new Map(drafting.map((l, i) => [l.id, drafts[i]?.data]));

  const noLeagues = !isLoading && leagues.length === 0;

  return (
    <div className="page-wrapper">
      <PageHeader />

      <main className="page-content">
        <PendingTradesBanner />

        <section className={`hero-section home-hero animate-in${noLeagues ? '' : ' compact'}`}>
          <div className="hero-eyebrow">Pokémon Fantasy League</div>
          <h1 className="hero-title">
            Hola, <span className="accent">{username}</span>
          </h1>
          {noLeagues && (
            <p className="hero-subtitle">
              Nomina, draftea y compite con tus Pokémon favoritos en ligas privadas con amigos.
            </p>
          )}

          <svg className="hero-ball" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <circle cx="50" cy="50" r="48" fill="none" stroke="currentColor" strokeWidth="1.5" />
            <line x1="2" y1="50" x2="98" y2="50" stroke="currentColor" strokeWidth="1.5" />
            <circle cx="50" cy="50" r="12" fill="none" stroke="currentColor" strokeWidth="1.5" />
            <circle cx="50" cy="50" r="6" fill="currentColor" />
          </svg>
        </section>

        {shown.length > 0 && <PushPrompt context="home" />}

        {isLoading && <SkeletonGrid count={2} />}

        {noLeagues && (
          <div className="nav-cards stagger">
            <Link className="nav-card nav-card-gold" to="/leagues">
              <div className="nav-card-icon nav-card-icon-gold">🏆</div>
              <h3>Crea o únete a una liga</h3>
              <p>Crea una liga e invita a tus amigos, o abre el enlace de invitación que te hayan pasado.</p>
              <span className="nav-card-arrow">Ir a Mis ligas <span>→</span></span>
            </Link>
            <div className="nav-card card-static">
              <div className="nav-card-icon">📖</div>
              <h3>Cómo funciona</h3>
              <p>Crea una liga → nomina Pokémon → draftea → ¡compite!</p>
              <span className="nav-card-arrow home-steps">3 pasos</span>
            </div>
          </div>
        )}

        {shown.length > 0 && (
          <section className="home-leagues animate-in" aria-labelledby="home-leagues-title">
            <div className="home-leagues-head">
              <h2 id="home-leagues-title" className="section-label">Tus ligas</h2>
              <Link className="home-leagues-all" to="/leagues">
                {leagues.length > HOME_LEAGUES ? `Ver todas (${leagues.length})` : 'Mis ligas'} →
              </Link>
            </div>
            <div className="home-league-list">
              {shown.map((league) => (
                <HomeLeagueCard
                  key={league.id}
                  league={league}
                  username={username}
                  schedule={scheduleOf.get(league.id)}
                  draft={draftOf.get(league.id)}
                />
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
