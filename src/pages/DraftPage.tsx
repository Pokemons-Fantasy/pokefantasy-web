import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { getDraftStatus, draftPick } from '../api/pokemons';
import { getClosedList } from '../api/pokemons';

export default function DraftPage() {
  const { leagueId } = useParams<{ leagueId: string }>();
  const username = useAuthStore((s) => s.username);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  const { data: draft, isLoading } = useQuery({
    queryKey: ['draft-status', leagueId],
    queryFn: () => getDraftStatus(leagueId!),
    refetchInterval: 5000,
    enabled: !!leagueId,
  });

  const { data: pool = [] } = useQuery({
    queryKey: ['closed-list', leagueId],
    queryFn: () => getClosedList(leagueId!),
    enabled: !!leagueId,
  });

  const pickedNames = new Set(draft?.picks?.map((p) => p.pokemonName) ?? []);
  const availablePool = pool.filter((p) => !pickedNames.has(p.pokemonName));
  const filtered = availablePool.filter((p) =>
    p.pokemonName.toLowerCase().includes(search.toLowerCase())
  );

  const isMyTurn = draft?.status === 'IN_PROGRESS' && draft.currentTurn === username;

  const { mutate: pick, isPending: picking } = useMutation({
    mutationFn: (pokemonName: string) => draftPick(leagueId!, pokemonName),
    onSuccess: () => {
      setError('');
      queryClient.invalidateQueries({ queryKey: ['draft-status', leagueId] });
      queryClient.invalidateQueries({ queryKey: ['closed-list', leagueId] });
    },
    onError: (err: Error) => setError(err.message ?? 'Error al hacer pick'),
  });

  return (
    <div className="home-container">
      <header>
        <h1 style={{ cursor: 'pointer' }} onClick={() => navigate(`/leagues/${leagueId}`)}>
          PokeFantasy
        </h1>
        <div>
          <span>Hola, <strong>{username}</strong></span>
          <button onClick={logout}>Cerrar sesión</button>
        </div>
      </header>

      <main>
        <div className="pool-header">
          <h2>Draft</h2>
          {draft && (
            <div>
              <span style={{ color: '#6bffb8', fontWeight: 600 }}>
                {draft.status === 'COMPLETED'
                  ? 'Completado'
                  : draft.status === 'IN_PROGRESS'
                  ? `Turno: ${draft.currentTurn} (Ronda ${draft.currentRound})`
                  : 'Pendiente'}
              </span>
            </div>
          )}
        </div>

        {isLoading && <p>Cargando draft...</p>}
        {!isLoading && !draft && <p style={{ color: '#aaa' }}>No hay draft activo en esta liga.</p>}

        {error && <p className="error">{error}</p>}

        {draft && draft.status === 'IN_PROGRESS' && (
          <>
            {isMyTurn ? (
              <>
                <p style={{ color: '#6bffb8', marginBottom: '0.5rem' }}>¡Es tu turno! Elige un pokémon del pool:</p>
                <input
                  className="search-input"
                  type="text"
                  placeholder="Buscar en el pool..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <div className="pokemon-grid">
                  {filtered.map((entry) => (
                    <div
                      key={entry.id}
                      className="pokemon-card"
                      style={{ cursor: picking ? 'not-allowed' : 'pointer' }}
                      onClick={() => { if (!picking) pick(entry.pokemonName); }}
                    >
                      <img src={entry.sprite} alt={entry.pokemonName} className="pokemon-sprite" />
                      <span className="pokemon-name">{entry.pokemonName}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p style={{ color: '#aaa' }}>Esperando el turno de <strong>{draft.currentTurn}</strong>...</p>
            )}
          </>
        )}

        {draft && draft.picks && draft.picks.length > 0 && (
          <div style={{ marginTop: '2rem' }}>
            <h3>Picks realizados</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '0.5rem' }}>
              <thead>
                <tr style={{ color: '#aaa', textAlign: 'left', borderBottom: '1px solid #333' }}>
                  <th style={{ padding: '0.4rem 0.75rem' }}>Ronda</th>
                  <th style={{ padding: '0.4rem 0.75rem' }}>Jugador</th>
                  <th style={{ padding: '0.4rem 0.75rem' }}>Pokémon</th>
                </tr>
              </thead>
              <tbody>
                {draft.picks.map((pick, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #222' }}>
                    <td style={{ padding: '0.4rem 0.75rem' }}>{pick.round}</td>
                    <td style={{ padding: '0.4rem 0.75rem' }}>{pick.username}</td>
                    <td style={{ padding: '0.4rem 0.75rem' }}>{pick.pokemonName}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
