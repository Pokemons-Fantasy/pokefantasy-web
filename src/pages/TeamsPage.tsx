import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import {
  getDraftStatus, getBench, getClosedList, swapWithBench, stealPokemon, setStealPrice,
} from '../api/pokemons';
import type { BenchEntry, DraftPick, Tier } from '../api/pokemons';
import { getMyCoinBalance, getSchedule, getLeagueSettings } from '../api/leagues';
import type { LeagueSettings } from '../api/leagues';
import TierBadge from '../components/TierBadge';

function spriteUrl(pokemonId: number) {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemonId}.png`;
}

// ── Tier helpers ──────────────────────────────────────────────────────────────

function tierRank(tier: Tier | null | undefined): number {
  if (!tier) return 4;
  return { S: 0, A: 1, B: 2, C: 3, D: 4 }[tier] ?? 4;
}

function priceForTier(settings: LeagueSettings | undefined, tier: Tier | null | undefined): number {
  if (!settings || !tier) return 0;
  const map: Record<Tier, number> = {
    S: settings.priceTierS,
    A: settings.priceTierA,
    B: settings.priceTierB,
    C: settings.priceTierC,
    D: settings.priceTierD,
  };
  return map[tier] ?? 0;
}

// ── Swap Modal ────────────────────────────────────────────────────────────────

interface SwapModalProps {
  benchEntry: BenchEntry;
  myPicks: DraftPick[];
  myBalance: number;
  tierByName: Map<string, Tier | null | undefined>;
  leagueSettings: LeagueSettings | undefined;
  swapping: boolean;
  error: string;
  onConfirm: (give: string) => void;
  onClose: () => void;
}

function SwapModal({
  benchEntry, myPicks, myBalance, tierByName, leagueSettings, swapping, error, onConfirm, onClose,
}: SwapModalProps) {
  const [giveTarget, setGiveTarget] = useState<string | null>(null);
  const takeTier = (benchEntry.tier as Tier | undefined) ?? tierByName.get(benchEntry.pokemonName);
  const takeTierRank = tierRank(takeTier);

  const giveTarget_tier = giveTarget ? tierByName.get(giveTarget) : undefined;
  const priceGive = giveTarget ? priceForTier(leagueSettings, giveTarget_tier) : 0;
  const priceTake = priceForTier(leagueSettings, takeTier);
  const net = priceGive - priceTake; // positive = receive coins; negative = pay coins

  // Net coin change after selection (only meaningful if giveTarget is valid)
  const netCostAbovePrice = giveTarget && tierRank(giveTarget_tier) <= takeTierRank
    ? net
    : null;

  // Overall affordability: bench entry base price + net (if negative)
  const basePrice = benchEntry.price ?? 0;
  const extraCost = netCostAbovePrice !== null && netCostAbovePrice < 0 ? -netCostAbovePrice : 0;
  const totalCost = basePrice + extraCost;
  const canAffordBase = basePrice === 0 || myBalance >= basePrice;

  return (
    <div
      className="modal-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal animate-in-fast" style={{ maxWidth: 520 }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '1.15rem' }}>Intercambio de banca</h2>
          <button
            className="btn-ghost"
            style={{ padding: '0.2rem 0.55rem', fontSize: '1rem', lineHeight: 1 }}
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        {/* Incoming pokemon */}
        <div style={{
          background: 'var(--surface-2)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          padding: '1rem 1.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1.25rem',
        }}>
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <img
              src={spriteUrl(benchEntry.pokemonId)}
              alt={benchEntry.pokemonName}
              style={{ width: 80, height: 80, imageRendering: 'pixelated', display: 'block' }}
            />
            <TierBadge tier={takeTier} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: '1.05rem', textTransform: 'capitalize', marginBottom: '0.35rem' }}>
              {benchEntry.pokemonName}
            </div>
            {takeTier && (
              <div style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginBottom: '0.45rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Tier {takeTier}
              </div>
            )}
            {basePrice > 0 ? (
              <span className="coin-badge coin-badge-lg">💰 {basePrice} monedas</span>
            ) : (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                color: 'var(--green)', fontSize: '0.85rem', fontWeight: 600,
              }}>
                ✓ Gratis
              </span>
            )}
          </div>
        </div>

        {/* Balance row (only shown when there's a base cost) */}
        {basePrice > 0 && (
          <div style={{
            background: canAffordBase ? 'rgba(52,211,153,0.05)' : 'rgba(248,113,113,0.05)',
            border: `1px solid ${canAffordBase ? 'rgba(52,211,153,0.18)' : 'rgba(248,113,113,0.18)'}`,
            borderRadius: 10,
            padding: '0.75rem 1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.75rem',
            flexWrap: 'wrap',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-2)' }}>Tu saldo</span>
              <span className="coin-badge" style={!canAffordBase ? {
                background: 'rgba(107,114,128,0.15)',
                borderColor: 'rgba(107,114,128,0.25)',
                color: '#9ca3af',
              } : {}}>
                💰 {myBalance}
              </span>
            </div>
            {canAffordBase ? (
              <span style={{ fontSize: '0.8rem', color: 'var(--green)', fontWeight: 600 }}>
                ✓ Saldo suficiente
              </span>
            ) : (
              <span style={{ fontSize: '0.8rem', color: 'var(--red)', fontWeight: 600 }}>
                Te faltan {basePrice - myBalance} monedas
              </span>
            )}
          </div>
        )}

        {/* Can't afford base — stop here */}
        {!canAffordBase && (
          <p style={{ fontSize: '0.875rem', color: 'var(--text-2)', textAlign: 'center', padding: '0.5rem 0' }}>
            Necesitas <strong style={{ color: 'var(--accent)' }}>💰 {basePrice}</strong> para fichar a este pokémon.
          </p>
        )}

        {/* Team pokemon selection */}
        {canAffordBase && myPicks.length > 0 && (
          <>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-2)', fontWeight: 500, marginBottom: '0.25rem' }}>
              ¿Qué pokémon de tu equipo entregas?
            </p>
            <div
              className="pokemon-grid"
              style={{ maxHeight: 260, overflowY: 'auto', paddingRight: '0.25rem' }}
            >
              {myPicks.map((pick) => {
                const giveTier = tierByName.get(pick.pokemonName);
                const isInvalidTier = tierRank(giveTier) > takeTierRank;
                const isChosen = giveTarget === pick.pokemonName;

                return (
                  <div
                    key={pick.pokemonName}
                    className="pokemon-card"
                    style={{
                      cursor: isInvalidTier ? 'not-allowed' : 'pointer',
                      opacity: isInvalidTier ? 0.4 : 1,
                      border: isChosen ? '1px solid var(--accent)' : undefined,
                      background: isChosen ? 'var(--accent-dim)' : undefined,
                      transform: isChosen ? 'translateY(-2px)' : undefined,
                      boxShadow: isChosen ? '0 0 14px var(--accent-glow)' : undefined,
                    }}
                    title={isInvalidTier ? `Tier ${giveTier ?? '?'} — no puedes dar un tier inferior` : undefined}
                    onClick={() => !isInvalidTier && setGiveTarget(isChosen ? null : pick.pokemonName)}
                  >
                    <img
                      src={spriteUrl(pick.pokemonId)}
                      alt={pick.pokemonName}
                      className="pokemon-sprite"
                      loading="lazy"
                    />
                    <span className="pokemon-name">{pick.pokemonName}</span>
                    <TierBadge tier={giveTier} />
                  </div>
                );
              })}
            </div>

            {/* Net coin change after selecting a give pokemon */}
            {netCostAbovePrice !== null && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.6rem 0.9rem',
                borderRadius: 8,
                background: netCostAbovePrice > 0
                  ? 'rgba(52,211,153,0.07)'
                  : netCostAbovePrice < 0
                  ? 'rgba(248,113,113,0.07)'
                  : 'rgba(255,255,255,0.04)',
                border: `1px solid ${
                  netCostAbovePrice > 0
                    ? 'rgba(52,211,153,0.2)'
                    : netCostAbovePrice < 0
                    ? 'rgba(248,113,113,0.2)'
                    : 'rgba(255,255,255,0.1)'
                }`,
                fontSize: '0.82rem',
              }}>
                {netCostAbovePrice > 0 ? (
                  <>
                    <span style={{ color: 'var(--green)', fontWeight: 700 }}>+💰 {netCostAbovePrice}</span>
                    <span style={{ color: 'var(--text-2)' }}>— recibes monedas por dar un tier superior</span>
                  </>
                ) : netCostAbovePrice < 0 ? (
                  <>
                    <span style={{ color: 'var(--red)', fontWeight: 700 }}>−💰 {-netCostAbovePrice}</span>
                    <span style={{ color: 'var(--text-2)' }}>— pagas la diferencia de tier</span>
                  </>
                ) : (
                  <span style={{ color: 'var(--text-3)' }}>Sin coste adicional</span>
                )}
                {netCostAbovePrice < 0 && myBalance < totalCost && (
                  <span style={{ color: 'var(--red)', marginLeft: 'auto' }}>
                    Saldo insuficiente
                  </span>
                )}
              </div>
            )}
          </>
        )}

        {error && <p className="error">{error}</p>}

        <div className="modal-actions">
          <button className="btn-ghost" onClick={onClose} disabled={swapping}>
            Cancelar
          </button>
          {canAffordBase && (
            <button
              className="btn-primary"
              disabled={!giveTarget || swapping || (netCostAbovePrice !== null && netCostAbovePrice < 0 && myBalance < totalCost)}
              onClick={() => giveTarget && onConfirm(giveTarget)}
            >
              {swapping ? 'Intercambiando…' : 'Confirmar intercambio'}
            </button>
          )}
        </div>

      </div>
    </div>
  );
}

// ── Steal Modal ───────────────────────────────────────────────────────────────

interface StealModalProps {
  pick: DraftPick;
  stealPrice: number;
  myBalance: number;
  tierByName: Map<string, Tier | null | undefined>;
  stealing: boolean;
  error: string;
  onConfirm: () => void;
  onClose: () => void;
}

function StealModal({
  pick, stealPrice, myBalance, tierByName, stealing, error, onConfirm, onClose,
}: StealModalProps) {
  const tier = tierByName.get(pick.pokemonName);
  const canAfford = myBalance >= stealPrice;

  return (
    <div
      className="modal-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal animate-in-fast" style={{ maxWidth: 440 }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '1.15rem' }}>Robar pokémon</h2>
          <button
            className="btn-ghost"
            style={{ padding: '0.2rem 0.55rem', fontSize: '1rem', lineHeight: 1 }}
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        {/* Pokemon info */}
        <div style={{
          background: 'var(--surface-2)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          padding: '1rem 1.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1.25rem',
        }}>
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <img
              src={spriteUrl(pick.pokemonId)}
              alt={pick.pokemonName}
              style={{ width: 72, height: 72, imageRendering: 'pixelated', display: 'block' }}
            />
            <TierBadge tier={tier} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: '1.05rem', textTransform: 'capitalize', marginBottom: '0.3rem' }}>
              {pick.pokemonName}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-3)', marginBottom: '0.5rem' }}>
              De: <strong>{pick.username}</strong>
            </div>
            <span className="coin-badge coin-badge-lg">💰 {stealPrice}</span>
          </div>
        </div>

        {/* Balance + rival gets */}
        <div style={{
          background: canAfford ? 'rgba(52,211,153,0.05)' : 'rgba(248,113,113,0.05)',
          border: `1px solid ${canAfford ? 'rgba(52,211,153,0.18)' : 'rgba(248,113,113,0.18)'}`,
          borderRadius: 10,
          padding: '0.75rem 1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.4rem',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-2)' }}>Tu saldo</span>
            <span className="coin-badge" style={!canAfford ? {
              background: 'rgba(107,114,128,0.15)',
              borderColor: 'rgba(107,114,128,0.25)',
              color: '#9ca3af',
            } : {}}>
              💰 {myBalance}
            </span>
          </div>
          {canAfford && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-3)' }}>
                ⚠️ {pick.username} recibirá
              </span>
              <span className="coin-badge" style={{ background: 'rgba(251,191,36,0.08)' }}>
                💰 {stealPrice * 2}
              </span>
            </div>
          )}
          {!canAfford && (
            <span style={{ fontSize: '0.8rem', color: 'var(--red)', fontWeight: 600 }}>
              Te faltan {stealPrice - myBalance} monedas
            </span>
          )}
        </div>

        {error && <p className="error">{error}</p>}

        <div className="modal-actions">
          <button className="btn-ghost" onClick={onClose} disabled={stealing}>
            Cancelar
          </button>
          <button
            className="btn-primary"
            disabled={!canAfford || stealing}
            onClick={onConfirm}
            style={canAfford ? { background: 'rgba(239,68,68,0.85)' } : undefined}
          >
            {stealing ? 'Robando…' : `Robar → 💰 ${stealPrice}`}
          </button>
        </div>

      </div>
    </div>
  );
}

// ── Set Price Modal ───────────────────────────────────────────────────────────

interface SetPriceModalProps {
  pick: DraftPick;
  currentPrice: number;
  myBalance: number;
  tierByName: Map<string, Tier | null | undefined>;
  saving: boolean;
  error: string;
  onConfirm: (newPrice: number) => void;
  onClose: () => void;
}

function SetPriceModal({
  pick, currentPrice, myBalance, tierByName, saving, error, onConfirm, onClose,
}: SetPriceModalProps) {
  const [inputVal, setInputVal] = useState('');
  const tier = tierByName.get(pick.pokemonName);
  const parsed = parseInt(inputVal, 10);
  const newPrice = isNaN(parsed) ? 0 : parsed;
  const investment = newPrice > currentPrice ? newPrice - currentPrice : 0;
  const isValid = newPrice > currentPrice;
  const canAfford = myBalance >= investment;

  return (
    <div
      className="modal-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal animate-in-fast" style={{ maxWidth: 400 }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '1.15rem' }}>Subir precio de robo</h2>
          <button
            className="btn-ghost"
            style={{ padding: '0.2rem 0.55rem', fontSize: '1rem', lineHeight: 1 }}
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        {/* Pokemon info */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          padding: '0.75rem 1rem',
          background: 'var(--surface-2)',
          borderRadius: 10,
          border: '1px solid var(--border)',
        }}>
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <img
              src={spriteUrl(pick.pokemonId)}
              alt={pick.pokemonName}
              style={{ width: 56, height: 56, imageRendering: 'pixelated', display: 'block' }}
            />
            <TierBadge tier={tier} />
          </div>
          <div>
            <div style={{ fontWeight: 600, textTransform: 'capitalize', marginBottom: '0.25rem' }}>
              {pick.pokemonName}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-3)' }}>
              Precio actual: <span className="coin-badge" style={{ fontSize: '0.72rem', marginLeft: '0.3rem' }}>💰 {currentPrice}</span>
            </div>
          </div>
        </div>

        {/* Input */}
        <div>
          <label style={{ fontSize: '0.82rem', color: 'var(--text-2)', display: 'block', marginBottom: '0.4rem' }}>
            Nuevo precio (debe ser mayor que {currentPrice})
          </label>
          <input
            type="number"
            min={currentPrice + 1}
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            placeholder={`> ${currentPrice}`}
            style={{
              width: '100%',
              padding: '0.5rem 0.75rem',
              background: 'var(--surface-2)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              color: 'var(--text-1)',
              fontSize: '0.9rem',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Investment summary */}
        {isValid && (
          <div style={{
            padding: '0.6rem 0.9rem',
            borderRadius: 8,
            background: canAfford ? 'rgba(52,211,153,0.05)' : 'rgba(248,113,113,0.05)',
            border: `1px solid ${canAfford ? 'rgba(52,211,153,0.18)' : 'rgba(248,113,113,0.18)'}`,
            display: 'flex',
            flexDirection: 'column',
            gap: '0.35rem',
            fontSize: '0.82rem',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-2)' }}>Inversión</span>
              <span style={{ color: canAfford ? 'var(--accent)' : 'var(--red)', fontWeight: 600 }}>💰 {investment}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-2)' }}>Tu saldo</span>
              <span>💰 {myBalance}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-3)' }}>Si te roban, recibirías</span>
              <span style={{ color: 'var(--green)', fontWeight: 600 }}>💰 {newPrice * 2}</span>
            </div>
            {!canAfford && (
              <span style={{ color: 'var(--red)', fontWeight: 600 }}>
                Saldo insuficiente — te faltan {investment - myBalance} monedas
              </span>
            )}
          </div>
        )}

        {error && <p className="error">{error}</p>}

        <div className="modal-actions">
          <button className="btn-ghost" onClick={onClose} disabled={saving}>
            Cancelar
          </button>
          <button
            className="btn-primary"
            disabled={!isValid || !canAfford || saving}
            onClick={() => isValid && canAfford && onConfirm(newPrice)}
          >
            {saving ? 'Guardando…' : `Invertir 💰 ${investment}`}
          </button>
        </div>

      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function TeamsPage() {
  const { leagueId } = useParams<{ leagueId: string }>();
  const username = useAuthStore((s) => s.username);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [modalBench, setModalBench] = useState<BenchEntry | null>(null);
  const [swapError, setSwapError] = useState('');

  const [modalSteal, setModalSteal] = useState<DraftPick | null>(null);
  const [stealError, setStealError] = useState('');

  const [modalSetPrice, setModalSetPrice] = useState<DraftPick | null>(null);
  const [setPriceError, setSetPriceError] = useState('');

  const [ownTeamCollapsed, setOwnTeamCollapsed] = useState(false);


  const { data: draft, isLoading } = useQuery({
    queryKey: ['draft-status', leagueId],
    queryFn: () => getDraftStatus(leagueId!),
    enabled: !!leagueId,
    staleTime: 30_000,
  });

  const { data: bench = [] } = useQuery({
    queryKey: ['bench', leagueId],
    queryFn: () => getBench(leagueId!),
    enabled: !!leagueId && draft?.status === 'COMPLETED',
    staleTime: 30_000,
  });

  const { data: closedList = [] } = useQuery({
    queryKey: ['closed-list', leagueId],
    queryFn: () => getClosedList(leagueId!),
    enabled: !!leagueId,
    staleTime: 30_000,
  });
  const tierByName = new Map(closedList.map((e) => [e.pokemonName, e.tier]));

  const { data: myCoins } = useQuery({
    queryKey: ['my-coins', leagueId],
    queryFn: () => getMyCoinBalance(leagueId!),
    enabled: !!leagueId && draft?.status === 'COMPLETED',
    staleTime: 30_000,
  });

  const { data: leagueSettings } = useQuery({
    queryKey: ['league-settings', leagueId],
    queryFn: () => getLeagueSettings(leagueId!),
    enabled: !!leagueId,
    staleTime: 120_000,
  });

  const maxTeamSize = leagueSettings?.maxTeamSize ?? 10;

  const { data: schedule } = useQuery({
    queryKey: ['schedule', leagueId],
    queryFn: () => getSchedule(leagueId!),
    enabled: !!leagueId && draft?.status === 'COMPLETED',
    staleTime: 60_000,
  });

  const activeJornada = schedule?.jornadas?.find(
    (j) => j.matches.some((m) => m.status === 'PENDING'),
  );

  const swapWindowClosed = (() => {
    if (!activeJornada?.swapDeadline) return false;
    return new Date() >= new Date(activeJornada.swapDeadline);
  })();

  const stealWindowOpen = (() => {
    if (!activeJornada?.stealDeadline) return false;
    return new Date() < new Date(activeJornada.stealDeadline);
  })();

  // ── Steal helpers ───────────────────────────────────────────────────────────

  function effectiveStealPrice(pick: DraftPick): number {
    if (pick.customStealPrice != null) return pick.customStealPrice;
    const tier = tierByName.get(pick.pokemonName);
    return priceForTier(leagueSettings, tier);
  }

  function isLocked(pick: DraftPick): boolean {
    if (pick.lockedUntilRound == null) return false;
    const jornada = schedule?.jornadas?.find((j) => j.roundNumber === pick.lockedUntilRound);
    return jornada?.matches.some((m) => m.status === 'PENDING') ?? false;
  }

  // ── Mutations ───────────────────────────────────────────────────────────────

  const { mutate: doSwap, isPending: swapping } = useMutation({
    mutationFn: ({ give, take }: { give: string; take: string }) =>
      swapWithBench(leagueId!, give, take),
    onSuccess: () => {
      setModalBench(null);
      setSwapError('');
      queryClient.invalidateQueries({ queryKey: ['draft-status', leagueId] });
      queryClient.invalidateQueries({ queryKey: ['bench', leagueId] });
      queryClient.invalidateQueries({ queryKey: ['my-coins', leagueId] });
    },
    onError: (err: Error) => setSwapError(err.message ?? 'Error al intercambiar'),
  });

  const { mutate: doSteal, isPending: stealing } = useMutation({
    mutationFn: (targetPokemonName: string) => stealPokemon(leagueId!, targetPokemonName),
    onSuccess: () => {
      setModalSteal(null);
      setStealError('');
      queryClient.invalidateQueries({ queryKey: ['draft-status', leagueId] });
      queryClient.invalidateQueries({ queryKey: ['my-coins', leagueId] });
    },
    onError: (err: Error) => setStealError(err.message ?? 'Error al robar'),
  });

  const { mutate: doSetPrice, isPending: settingPrice } = useMutation({
    mutationFn: ({ pokemonName, newPrice }: { pokemonName: string; newPrice: number }) =>
      setStealPrice(leagueId!, pokemonName, newPrice),
    onSuccess: () => {
      setModalSetPrice(null);
      setSetPriceError('');
      queryClient.invalidateQueries({ queryKey: ['draft-status', leagueId] });
      queryClient.invalidateQueries({ queryKey: ['my-coins', leagueId] });
    },
    onError: (err: Error) => setSetPriceError(err.message ?? 'Error al establecer precio'),
  });

  // ── Data ────────────────────────────────────────────────────────────────────

  const teams = draft
    ? draft.turnOrder.map((player) => ({
        username: player,
        picks: (draft.picks ?? [])
          .filter((p) => p.username === player)
          .sort((a, b) => a.pokemonId - b.pokemonId),
      }))
    : [];

  const myTeam = teams.find((t) => t.username === username);
  const isDraftCompleted = draft?.status === 'COMPLETED';
  const myBalance = myCoins?.coins ?? 0;

  function handleBenchCardClick(entry: BenchEntry) {
    if (!isDraftCompleted) return;
    if (!myTeam || myTeam.picks.length === 0) return;
    if (swapWindowClosed) return;
    setSwapError('');
    setModalBench(entry);
  }

  function renderPicks(team: { username: string; picks: DraftPick[] }, isMe: boolean) {
    if (team.picks.length === 0) {
      return <p style={{ color: 'var(--text-3)', fontSize: '0.875rem' }}>Sin picks aún</p>;
    }
    return (
      <div className="pokemon-grid">
        {team.picks.map((pick) => {
          const locked = isLocked(pick);
          const sp = effectiveStealPrice(pick);
          const canAffordSteal = myBalance >= sp;

          if (isMe) {
            // Own pokemon card
            return (
              <div key={pick.pokemonName} className="pokemon-card" style={{ cursor: 'default', position: 'relative' }}>
                <img
                  src={spriteUrl(pick.pokemonId)}
                  alt={pick.pokemonName}
                  className="pokemon-sprite"
                  loading="lazy"
                />
                <span className="pokemon-name">{pick.pokemonName}</span>
                <TierBadge tier={tierByName.get(pick.pokemonName)} />
                {/* Steal price badge */}
                {stealWindowOpen && (
                  <>
                    <span className="coin-badge" style={{
                      marginTop: '0.25rem',
                      fontSize: '0.68rem',
                      background: 'rgba(251,191,36,0.1)',
                      borderColor: 'rgba(251,191,36,0.25)',
                    }}>
                      🛡 {sp}
                    </span>
                    <button
                      onClick={() => { setSetPriceError(''); setModalSetPrice(pick); }}
                      title="Subir precio de robo"
                      style={{
                        marginTop: '0.2rem',
                        padding: '0.15rem 0.4rem',
                        fontSize: '0.65rem',
                        background: 'rgba(99,102,241,0.15)',
                        border: '1px solid rgba(99,102,241,0.3)',
                        borderRadius: 4,
                        color: '#a5b4fc',
                        cursor: 'pointer',
                      }}
                    >
                      ⬆ precio
                    </button>
                  </>
                )}
              </div>
            );
          } else {
            // Rival pokemon card
            const isClickable = stealWindowOpen && !locked && canAffordSteal;
            return (
              <div
                key={pick.pokemonName}
                className="pokemon-card"
                style={{
                  cursor: isClickable ? 'pointer' : 'default',
                  opacity: stealWindowOpen && (locked || !canAffordSteal) ? 0.5 : 1,
                }}
                title={
                  locked ? '🔒 Bloqueado hasta que finalice la jornada'
                  : !canAffordSteal && stealWindowOpen ? `Sin monedas (necesitas ${sp})`
                  : undefined
                }
                onClick={() => {
                  if (isClickable) {
                    setStealError('');
                    setModalSteal(pick);
                  }
                }}
              >
                <img
                  src={spriteUrl(pick.pokemonId)}
                  alt={pick.pokemonName}
                  className="pokemon-sprite"
                  loading="lazy"
                />
                <span className="pokemon-name">{pick.pokemonName}</span>
                <TierBadge tier={tierByName.get(pick.pokemonName)} />
                {stealWindowOpen && (
                  locked ? (
                    <span style={{ marginTop: '0.25rem', fontSize: '0.75rem' }}>🔒</span>
                  ) : (
                    <span className="coin-badge" style={{
                      marginTop: '0.25rem',
                      fontSize: '0.68rem',
                      background: canAffordSteal ? 'rgba(239,68,68,0.1)' : 'rgba(107,114,128,0.15)',
                      borderColor: canAffordSteal ? 'rgba(239,68,68,0.3)' : 'rgba(107,114,128,0.25)',
                      color: canAffordSteal ? '#f87171' : '#9ca3af',
                    }}>
                      💰 {sp}
                    </span>
                  )
                )}
              </div>
            );
          }
        })}
      </div>
    );
  }

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

      {/* Swap confirmation modal */}
      {modalBench && myTeam && (
        <SwapModal
          benchEntry={modalBench}
          myPicks={myTeam.picks}
          myBalance={myBalance}
          tierByName={tierByName}
          leagueSettings={leagueSettings}
          swapping={swapping}
          error={swapError}
          onConfirm={(give) => doSwap({ give, take: modalBench.pokemonName })}
          onClose={() => { setModalBench(null); setSwapError(''); }}
        />
      )}

      {/* Steal modal */}
      {modalSteal && (
        <StealModal
          pick={modalSteal}
          stealPrice={effectiveStealPrice(modalSteal)}
          myBalance={myBalance}
          tierByName={tierByName}
          stealing={stealing}
          error={stealError}
          onConfirm={() => doSteal(modalSteal.pokemonName)}
          onClose={() => { setModalSteal(null); setStealError(''); }}
        />
      )}

      {/* Set price modal */}
      {modalSetPrice && (
        <SetPriceModal
          pick={modalSetPrice}
          currentPrice={effectiveStealPrice(modalSetPrice)}
          myBalance={myBalance}
          tierByName={tierByName}
          saving={settingPrice}
          error={setPriceError}
          onConfirm={(newPrice) => doSetPrice({ pokemonName: modalSetPrice.pokemonName, newPrice })}
          onClose={() => { setModalSetPrice(null); setSetPriceError(''); }}
        />
      )}

      <main className="page-content">
        <h1 className="page-title">Equipos</h1>

        {isLoading && <p style={{ color: 'var(--text-3)' }}>Cargando...</p>}

        {!isLoading && !draft && (
          <div className="empty-state">
            <p>No hay draft en esta liga.</p>
          </div>
        )}

        {swapWindowClosed && (
          <div className="my-turn-banner" style={{
            background: 'rgba(248,113,113,0.07)',
            borderColor: 'rgba(248,113,113,0.25)',
            color: '#f87171',
            marginBottom: '0.75rem',
          }}>
            🔒 Intercambios cerrados hasta que se registren todos los resultados de la jornada
          </div>
        )}

        {stealWindowOpen && (
          <div className="my-turn-banner" style={{
            background: 'rgba(251,191,36,0.07)',
            borderColor: 'rgba(251,191,36,0.25)',
            color: '#fbbf24',
            marginBottom: '0.75rem',
          }}>
            🔓 Ventana de robos abierta — cierra el jueves a las 23:59
          </div>
        )}

        {draft && teams.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem', marginTop: '1.5rem' }}>
            {myTeam && (
              <div className="own-team-panel">
                <div className="own-team-panel-header">
                  <div className="member-avatar">{myTeam.username[0]}</div>
                  <span style={{ fontWeight: 600, fontSize: '1rem' }}>Tu equipo</span>
                  <span style={{ color: 'var(--text-3)', fontSize: '0.85rem' }}>
                    {myTeam.picks.length}/{maxTeamSize}
                  </span>
                  <span className="badge badge-green">Tú</span>
                  {myCoins !== undefined && (
                    <span className="coin-badge">💰 {myCoins.coins}</span>
                  )}
                  <button
                    className="btn-ghost own-team-collapse-btn"
                    onClick={() => setOwnTeamCollapsed((c) => !c)}
                  >
                    {ownTeamCollapsed ? '▶ Mostrar' : '▼ Ocultar'}
                  </button>
                </div>
                {!ownTeamCollapsed && (
                  <div className="own-team-panel-grid">{renderPicks(myTeam, true)}</div>
                )}
              </div>
            )}

            {teams.filter((team) => team.username !== username).map((team) => (
              <div key={team.username}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <div className="member-avatar">{team.username[0]}</div>
                  <span style={{ fontWeight: 600, fontSize: '1rem' }}>{team.username}</span>
                  <span style={{ color: 'var(--text-3)', fontSize: '0.85rem' }}>
                    {team.picks.length}/{maxTeamSize}
                  </span>
                </div>
                {renderPicks(team, false)}
              </div>
            ))}
          </div>
        )}

        {/* ── Bench ── */}
        {isDraftCompleted && (
          <div style={{ marginTop: '3rem' }}>
            <hr className="divider" />
            <p className="section-label">Banca</p>

            {bench.length === 0 ? (
              <p style={{ color: 'var(--text-3)', fontSize: '0.875rem' }}>
                No quedan pokémons en la banca.
              </p>
            ) : (
              <>
                {!swapWindowClosed && myTeam && myTeam.picks.length > 0 && (
                  <p style={{ color: 'var(--text-2)', fontSize: '0.875rem', marginBottom: '1rem' }}>
                    Haz click en un pokémon de la banca para ver el precio e intercambiarlo.
                  </p>
                )}
                <div className="pokemon-grid">
                  {bench.map((entry) => {
                    const price = entry.price ?? 0;
                    const canAfford = price === 0 || myBalance >= price;
                    const isClickable = !swapWindowClosed && !!(myTeam && myTeam.picks.length > 0);
                    const tier = (entry.tier as Tier | undefined) ?? tierByName.get(entry.pokemonName);

                    return (
                      <div
                        key={entry.pokemonName}
                        className="pokemon-card"
                        style={{
                          cursor: isClickable ? 'pointer' : 'default',
                          opacity: isClickable && !canAfford ? 0.5 : 1,
                        }}
                        title={
                          swapWindowClosed
                            ? 'Intercambios cerrados'
                            : !canAfford
                            ? `Sin monedas (necesitas ${price})`
                            : undefined
                        }
                        onClick={() => isClickable && handleBenchCardClick(entry)}
                      >
                        <img
                          src={spriteUrl(entry.pokemonId)}
                          alt={entry.pokemonName}
                          className="pokemon-sprite"
                          loading="lazy"
                        />
                        <span className="pokemon-name">{entry.pokemonName}</span>
                        <TierBadge tier={tier} />

                        {/* Price badge — always visible */}
                        {price > 0 ? (
                          <span
                            className="coin-badge"
                            style={{
                              marginTop: '0.3rem',
                              fontSize: '0.7rem',
                              background: canAfford
                                ? 'rgba(251,191,36,0.12)'
                                : 'rgba(107,114,128,0.15)',
                              borderColor: canAfford
                                ? 'rgba(251,191,36,0.3)'
                                : 'rgba(107,114,128,0.25)',
                              color: canAfford ? 'var(--accent)' : '#9ca3af',
                            }}
                          >
                            💰 {price}
                          </span>
                        ) : (
                          <span style={{
                            marginTop: '0.3rem',
                            fontSize: '0.68rem',
                            color: 'var(--green)',
                            fontWeight: 600,
                          }}>
                            Gratis
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
