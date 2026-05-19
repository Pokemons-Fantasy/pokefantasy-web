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
import type { AvailablePokemon } from '../api/pokemons';
import TierBadge from '../components/TierBadge';

const MAX_NOMINATIONS = 16;

type GenFilter = 'all' | 'gen1' | 'gen2' | 'gen3' | 'gen4' | 'gen5' | 'gen6' | 'gen7' | 'gen8' | 'gen9' | 'forms';

const GEN_TABS: { label: string; key: GenFilter; min?: number; max?: number }[] = [
  { label: 'Todos',    key: 'all' },
  { label: 'Gen I',   key: 'gen1', min: 1,   max: 151  },
  { label: 'Gen II',  key: 'gen2', min: 152, max: 251  },
  { label: 'Gen III', key: 'gen3', min: 252, max: 386  },
  { label: 'Gen IV',  key: 'gen4', min: 387, max: 493  },
  { label: 'Gen V',   key: 'gen5', min: 494, max: 649  },
  { label: 'Gen VI',  key: 'gen6', min: 650, max: 721  },
  { label: 'Gen VII', key: 'gen7', min: 722, max: 809  },
  { label: 'Gen VIII',key: 'gen8', min: 810, max: 905  },
  { label: 'Gen IX',  key: 'gen9', min: 906, max: 1025 },
  { label: 'Formas',  key: 'forms' },
];

function matchesGen(p: AvailablePokemon, gen: GenFilter): boolean {
  if (gen === 'all') return true;
  if (gen === 'forms') return p.id >= 10000;
  const tab = GEN_TABS.find((t) => t.key === gen);
  if (!tab || tab.min === undefined || tab.max === undefined) return false;
  return p.id >= tab.min && p.id <= tab.max && p.id < 10000;
}

export default function PoolPage() {
  const { leagueId } = useParams<{ leagueId: string }>();
  const username = useAuthStore((s) => s.username);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [genFilter, setGenFilter] = useState<GenFilter>('all');
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
  const tierByName = new Map(closedList.map((e) => [e.pokemonName, e.tier]));
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

  const filtered = available
    .filter((p) => p.name.toLowerCase().includes(search.toLowerCase()))
    .filter((p) => matchesGen(p, genFilter));

  return (
    <div className="page-wrapper">
      <header className="page-header">
        <div className="page-header-inner">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button className="btn-back" onClick={() => navigate(`/leagues/${leagueId}`)}>← Liga</button>
            <span className="logo" onClick={() => navigate('/leagues')}>PokeFantasy</span>
          </div>
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

        <div className="gen-tabs">
          {GEN_TABS.map((tab) => (
            <button
              key={tab.key}
              className={`gen-tab${genFilter === tab.key ? ' active' : ''}`}
              onClick={() => setGenFilter(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>

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
                {isNominated && <TierBadge tier={tierByName.get(pokemon.name)} />}
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
