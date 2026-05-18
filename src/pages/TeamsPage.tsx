import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { getDraftStatus } from '../api/pokemons';

export default function TeamsPage() {
  const { leagueId } = useParams<{ leagueId: string }>();
  const username = useAuthStore((s) => s.username);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  const { data: draft, isLoading } = useQuery({
    queryKey: ['draft-status', leagueId],
    queryFn: () => getDraftStatus(leagueId!),
    enabled: !!leagueId,
    staleTime: 30_000,
  });

  const teams = draft
    ? draft.turnOrder.map((player) => ({
        username: player,
        picks: (draft.picks ?? []).filter((p) => p.username === player),
      }))
    : [];

  return (
    <div className="page-wrapper">
      <header className="page-header">
        <div className="page-header-inner">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button className="btn-back" onClick={() => navigate(`/leagues/${leagueId}/draft`)}>
              ← Draft
            </button>
            <span className="logo" onClick={() => navigate('/leagues')}>PokeFantasy</span>
          </div>
          <div className="header-right">
            <span className="header-user">Hola, <strong>{username}</strong></span>
            <button className="btn-ghost" onClick={logout}>Cerrar sesión</button>
          </div>
        </div>
      </header>

      <main className="page-content">
        <h1 className="page-title">Equipos</h1>

        {isLoading && <p style={{ color: 'var(--text-3)' }}>Cargando...</p>}

        {!isLoading && !draft && (
          <div className="empty-state">
            <p>No hay draft en esta liga.</p>
          </div>
        )}

        {draft && teams.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem', marginTop: '1.5rem' }}>
            {teams.map((team) => (
              <div key={team.username}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <div className="member-avatar">{team.username[0]}</div>
                  <span style={{ fontWeight: 600, fontSize: '1rem' }}>{team.username}</span>
                  <span style={{ color: 'var(--text-3)', fontSize: '0.85rem' }}>
                    {team.picks.length}/10
                  </span>
                  {team.username === username && (
                    <span className="badge badge-green">Tú</span>
                  )}
                </div>

                {team.picks.length === 0 ? (
                  <p style={{ color: 'var(--text-3)', fontSize: '0.875rem', paddingLeft: '0.25rem' }}>
                    Sin picks aún
                  </p>
                ) : (
                  <div className="pokemon-grid">
                    {team.picks.map((pick) => (
                      <div key={pick.pokemonName} className="pokemon-card">
                        <img
                          src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pick.pokemonId}.png`}
                          alt={pick.pokemonName}
                          className="pokemon-sprite"
                          loading="lazy"
                        />
                        <span className="pokemon-name">{pick.pokemonName}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
