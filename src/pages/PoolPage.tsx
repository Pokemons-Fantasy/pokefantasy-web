import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import {
  getAvailablePokemons,
  getClosedList,
  getDraftStatus,
  nominatePokemon,
  denominatePokemon,
} from '../api/pokemons';

const MAX_NOMINATIONS = 16;

export default function PoolPage() {
  const { leagueId } = useParams<{ leagueId: string }>();
  const username = useAuthStore((s) => s.username);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  const { data: available = [], isLoading: loadingPokemons } = useQuery({
    queryKey: ['available-pokemons'],
    queryFn: getAvailablePokemons,
  });

  const { data: closedList = [] } = useQuery({
    queryKey: ['closed-list', leagueId],
    queryFn: () => getClosedList(leagueId!),
    enabled: !!leagueId,
  });

  const { data: draftStatus } = useQuery({
    queryKey: ['draft-status', leagueId],
    queryFn: () => getDraftStatus(leagueId!),
    refetchInterval: 10000,
    enabled: !!leagueId,
  });

  const myNominations = closedList.filter((e) => e.nominatedBy === username);
  const nominatedNames = new Set(closedList.map((e) => e.pokemonName));
  const isDraftActive = draftStatus && draftStatus.status !== 'PENDING';
  const canNominate = !isDraftActive && myNominations.length < MAX_NOMINATIONS;
  const pct = (myNominations.length / MAX_NOMINATIONS) * 100;

  const { mutate: nominate, isPending } = useMutation({
    mutationFn: (pokemonName: string) => nominatePokemon(leagueId!, pokemonName),
    onSuccess: () => {
      setError('');
      queryClient.invalidateQueries({ queryKey: ['closed-list', leagueId] });
    },
    onError: (err: Error) => setError(err.message ?? 'Error al nominar'),
  });

  const { mutate: denominate } = useMutation({
    mutationFn: (pokemonName: string) => denominatePokemon(leagueId!, pokemonName),
    onSuccess: () => {
      setError('');
      queryClient.invalidateQueries({ queryKey: ['closed-list', leagueId] });
    },
    onError: (err: Error) => setError(err.message ?? 'Error al desnominar'),
  });

  const filtered = available.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="page-wrapper">
      <header className="page-header">
        <div className="page-header-inner">
          <span className="logo" onClick={() => navigate(`/leagues/${leagueId}`)}>PokeFantasy</span>
          <div className="header-right">
            <span className="header-user">Hola, <strong>{username}</strong></span>
            <button className="btn-ghost" onClick={logout}>Cerrar sesión</button>
          </div>
        </div>
      </header>

      <main className="page-content">
        <div className="section-header">
          <div>
            <h1 className="page-title">Pool de nominaciones</h1>
            <div className="nom-row" style={{ marginTop: '0.5rem', marginBottom: 0 }}>
              <span className="nom-label">Tus nominaciones</span>
              <span className={`nom-count ${myNominations.length >= MAX_NOMINATIONS ? 'full' : ''}`}>
                {myNominations.length}/{MAX_NOMINATIONS}
              </span>
              <div className="nom-bar">
                <div
                  className={`nom-bar-fill ${myNominations.length >= MAX_NOMINATIONS ? 'full' : ''}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          </div>
          {isDraftActive && <span className="draft-active-badge">Draft activo</span>}
        </div>

        {error && <p className="error" style={{ marginBottom: '1rem' }}>{error}</p>}

        <input
          className="search-input"
          type="text"
          placeholder="Buscar pokémon..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {loadingPokemons && <p style={{ color: 'var(--text-3)' }}>Cargando pokémons...</p>}

        <div className="pokemon-grid">
          {filtered.map((pokemon) => {
            const isNominated = nominatedNames.has(pokemon.name);
            const isOwn = myNominations.some((n) => n.pokemonName === pokemon.name);
            return (
              <div
                key={pokemon.id}
                className={`pokemon-card ${isNominated ? 'nominated' : ''} ${isOwn ? 'own' : ''}`}
                onClick={() => {
                  if (isDraftActive || isPending) return;
                  if (isOwn) denominate(pokemon.name);
                  else if (!isNominated && canNominate) nominate(pokemon.name);
                }}
                title={
                  isOwn ? 'Clic para quitar'
                  : isNominated ? 'Ya nominado'
                  : !canNominate ? (isDraftActive ? 'Draft activo' : 'Límite alcanzado')
                  : 'Clic para nominar'
                }
              >
                <img src={pokemon.spriteUrl} alt={pokemon.name} className="pokemon-sprite" />
                <span className="pokemon-name">{pokemon.name}</span>
                {isOwn && <span className="pokemon-tag pokemon-tag-own">Tuyo</span>}
                {isNominated && !isOwn && <span className="pokemon-tag pokemon-tag-taken">Tomado</span>}
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
