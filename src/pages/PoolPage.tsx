import { useState, type CSSProperties } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import {
  getAvailablePokemons,
  getClosedList,
  getDraftStatus,
  nominatePokemon,
  denominatePokemon,
} from '../api/pokemons';
import type { ClosedListEntry } from '../api/pokemons';
import PokemonDetailModal from '../components/PokemonDetailModal';
import PoolCard from '../components/pool/PoolCard';
import { useToastStore } from '../store/toastStore';
import { extractErrorMessage } from '../utils/errorMessage';
import { SkeletonGrid } from '../components/SkeletonGrid';
import LeaguePhaseBadge from '../components/LeaguePhaseBadge';
import Notice from '../components/Notice';
import { TYPE_COLORS } from '../utils/colors';
import { typeLabel } from '../utils/pokemonTypes';
import {
  GEN_TABS,
  POKEMON_TYPES,
  cardState,
  groupByNominator,
  matchesGen,
  matchesType,
  matchesView,
  nominationsOpen,
  pokemonTypes,
  showsTiers,
  type GenFilter,
  type PoolView,
} from '../utils/pool';

const MAX_NOMINATIONS = 16;

export default function PoolPage() {
  const { leagueId } = useParams<{ leagueId: string }>();
  const username = useAuthStore((s) => s.username);
  const queryClient = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);
  const [search, setSearch] = useState('');
  const [genFilter, setGenFilter] = useState<GenFilter>('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [view, setView] = useState<PoolView>('all');
  const [detailEntry, setDetailEntry] = useState<ClosedListEntry | null>(null);

  const { data: available = [], isLoading: loadingPokemons } = useQuery({
    queryKey: ['available-pokemons'],
    queryFn: getAvailablePokemons,
    staleTime: 10 * 60_000,
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
  const entryByName = new Map(closedList.map((e) => [e.pokemonName, e]));
  const phaseStatus = draftStatus?.status ?? null;
  const nominationsClosed = !nominationsOpen(phaseStatus);
  // Sin draft o tras cancelarlo los tiers no significan nada (se recalculan al preparar el siguiente)
  const tierOf = (entry: ClosedListEntry | undefined) => (showsTiers(phaseStatus) ? entry?.tier : undefined);
  const canNominate = !nominationsClosed && myNominations.length < MAX_NOMINATIONS;
  const pct = (myNominations.length / MAX_NOMINATIONS) * 100;
  // Con un backend anterior la lista no trae tipos: sin filtro por tipo
  const hasTypes = available.some((p) => p.types && p.types.length > 0);

  const { mutate: nominate, isPending: nominating } = useMutation({
    mutationFn: (pokemonName: string) => nominatePokemon(leagueId!, pokemonName),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['closed-list', leagueId] }),
    onError: (err) => addToast('error', extractErrorMessage(err, 'Error al nominar')),
  });

  const { mutate: denominate, isPending: denominating } = useMutation({
    mutationFn: (pokemonName: string) => denominatePokemon(leagueId!, pokemonName),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['closed-list', leagueId] }),
    onError: (err) => addToast('error', extractErrorMessage(err, 'Error al quitar la nominación')),
  });

  const query = search.trim().toLowerCase();
  const cards = available
    .filter((p) => p.name.toLowerCase().includes(query))
    .filter((p) => matchesGen(p, genFilter))
    .map((p) => ({ pokemon: p, entry: entryByName.get(p.name), types: pokemonTypes(p, entryByName.get(p.name)) }))
    .filter((c) => !hasTypes || matchesType(c.types, typeFilter))
    .filter((c) => matchesView(c.entry, view, username));
  const groups = view === 'nominated' ? groupByNominator(cards, username) : null;
  const VIEWS: { key: PoolView; label: string }[] = [
    { key: 'all', label: 'Todos' },
    { key: 'nominated', label: `Nominados (${closedList.length})` },
    { key: 'mine', label: `Los míos (${myNominations.length})` },
  ];

  return (
    <>
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
          <LeaguePhaseBadge draftStatus={phaseStatus} />
        </div>

        {phaseStatus === 'PENDING' && (
          <Notice variant="info">Nominaciones cerradas: se está preparando el draft</Notice>
        )}
        {phaseStatus === 'CANCELLED' && (
          <Notice variant="info">El draft se canceló: las nominaciones vuelven a estar abiertas.</Notice>
        )}

        <div className="gen-tabs pool-view-tabs" role="group" aria-label="Mostrar">
          {VIEWS.map((v) => (
            <button
              key={v.key}
              type="button"
              className={`gen-tab${view === v.key ? ' active' : ''}`}
              aria-pressed={view === v.key}
              onClick={() => setView(v.key)}
            >
              {v.label}
            </button>
          ))}
        </div>

        <div className="gen-tabs" role="group" aria-label="Generación">
          {GEN_TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={`gen-tab${genFilter === tab.key ? ' active' : ''}`}
              aria-pressed={genFilter === tab.key}
              onClick={() => setGenFilter(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {hasTypes && (
          <div className="gen-tabs pool-type-tabs" role="group" aria-label="Tipo">
            <button
              type="button"
              className={`gen-tab${typeFilter === 'all' ? ' active' : ''}`}
              aria-pressed={typeFilter === 'all'}
              onClick={() => setTypeFilter('all')}
            >
              Todos los tipos
            </button>
            {POKEMON_TYPES.map((type) => (
              <button
                key={type}
                type="button"
                className={`gen-tab type-tab${typeFilter === type ? ' active' : ''}`}
                style={{ '--type-color': TYPE_COLORS[type]?.color } as CSSProperties}
                aria-pressed={typeFilter === type}
                onClick={() => setTypeFilter(type)}
              >
                {typeLabel(type)}
              </button>
            ))}
          </div>
        )}

        <input
          className="search-input"
          type="search"
          placeholder="Buscar Pokémon..."
          aria-label="Buscar Pokémon"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {loadingPokemons && <SkeletonGrid count={8} cardHeight="110px" />}

        {!loadingPokemons && cards.length === 0 && (
          <p className="empty-state">
            {view === 'all' ? 'Ningún Pokémon coincide con los filtros.'
              : view === 'mine' && myNominations.length === 0 ? 'Todavía no has nominado ningún Pokémon.'
              : closedList.length === 0 ? 'Todavía no hay ningún Pokémon nominado.'
              : 'Ningún Pokémon nominado coincide con los filtros.'}
          </p>
        )}

        {(groups ?? [{ nominatedBy: '', items: cards }]).map((group) => (
          <section key={group.nominatedBy || 'all'} className="pool-group" aria-labelledby={group.nominatedBy ? `pool-group-${group.nominatedBy}` : undefined}>
            {group.nominatedBy && (
              <h2 id={`pool-group-${group.nominatedBy}`} className="pool-group-title">
                {group.nominatedBy === username ? 'Tus nominaciones' : group.nominatedBy} · {group.items.length}
              </h2>
            )}
            <div className="pokemon-grid pool-grid">
              {group.items.map(({ pokemon, entry, types }) => {
                const isOwn = entry?.nominatedBy === username;
                const state = cardState({ isNominated: !!entry, isOwn, nominationsClosed, canNominate });
                return (
                  <PoolCard
                    key={pokemon.id}
                    id={pokemon.id}
                    name={pokemon.name}
                    types={types}
                    state={state}
                    tier={tierOf(entry)}
                    nominatedBy={entry?.nominatedBy}
                    busy={nominating || denominating}
                    onToggle={() => (state === 'own' ? denominate(pokemon.name) : nominate(pokemon.name))}
                    onInfo={entry ? () => setDetailEntry(entry) : undefined}
                  />
                );
              })}
            </div>
          </section>
        ))}
      </main>
      {detailEntry && (
        <PokemonDetailModal
          pokemonId={detailEntry.pokemonId}
          pokemonName={detailEntry.pokemonName}
          tier={tierOf(detailEntry)}
          stats={detailEntry.stats}
          types={detailEntry.types}
          onClose={() => setDetailEntry(null)}
        />
      )}
    </>
  );
}
