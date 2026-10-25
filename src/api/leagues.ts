import { apiClient } from './client';
import type { MatchScore } from '../utils/score';
import type { DraftStatus } from './pokemons';

/** Estado del draft vigente de la liga; null si no tiene draft. Opcional: el backend antiguo no lo envía. */
export type LeagueDraftStatus = DraftStatus['status'] | null;

export interface League {
  id: string;
  name: string;
  createdBy: string;
  memberCount: number;
  /** Obsoleto: el backend nunca lo pasa a ACTIVE. Usar draftStatus. */
  status: 'SETUP' | 'ACTIVE';
  draftStatus?: LeagueDraftStatus;
}

export interface LeagueMember {
  username: string;
  leagueRole: 'ADMIN' | 'USER';
  /** Versión de su foto de perfil; null o ausente = sin foto. */
  avatarVersion?: number | null;
  /** Nombre de su cuenta de Pokémon Showdown; null o ausente = sin vincular. */
  showdownName?: string | null;
}

export interface LeagueDetail {
  id: string;
  name: string;
  createdBy: string;
  members: LeagueMember[];
  /** Obsoleto: el backend nunca lo pasa a ACTIVE. Usar draftStatus. */
  status: 'SETUP' | 'ACTIVE';
  draftStatus?: LeagueDraftStatus;
}

export const createLeague = async (name: string): Promise<string> => {
  const { data } = await apiClient.post<string>('/v1/leagues', { name });
  return data;
};

export const addMember = async (leagueId: string, username: string): Promise<void> => {
  await apiClient.post(`/v1/leagues/${leagueId}/members`, { username });
};

export const getMyLeagues = async (): Promise<League[]> => {
  const { data } = await apiClient.get<League[]>('/v1/leagues/my');
  return data;
};

export const getLeagueDetail = async (leagueId: string): Promise<LeagueDetail> => {
  const { data } = await apiClient.get<LeagueDetail>(`/v1/leagues/${leagueId}`);
  return data;
};

export const removeMember = async (leagueId: string, username: string): Promise<void> => {
  await apiClient.delete(`/v1/leagues/${leagueId}/members/${username}`);
};

/** Admin: hace admin a otro miembro (idempotente). */
export const promoteToAdmin = async (leagueId: string, username: string): Promise<void> => {
  await apiClient.put(`/v1/leagues/${leagueId}/members/${username}/admin`);
};

// ── Settings ──────────────────────────────────────────────────────────────────

export interface LeagueSettings {
  coinsPerWin: number;
  coinsPerLoss: number;
  priceTierS: number;
  priceTierA: number;
  priceTierB: number;
  priceTierC: number;
  priceTierD: number;
  seasonStartDate?: string; // ISO "YYYY-MM-DD"
  maxTeamSize?: number;     // default 10 (DraftPickCommandHandler); también son las rondas del draft
  tierPctS: number;         // % of pool → S tier (default 20)
  tierPctA: number;         // % of pool → A tier (default 20)
  tierPctB: number;         // % of pool → B tier (default 20)
  tierPctC: number;         // % of pool → C tier (default 20)
  tierPctD: number;         // % of pool → D tier (default 20)
  turnTimerSeconds?: number; // seconds per turn; 0 = disabled
  stealWindowCloseDay?: number;   // ISO 1-7 (1=Mon…7=Sun), default 4 (Thu)
  stealWindowCloseTime?: string;  // "HH:mm", default "23:59"
  swapWindowCloseDay?: number;    // ISO 1-7, default 5 (Fri)
  swapWindowCloseTime?: string;   // "HH:mm", default "16:00"
  // Combates en Showdown; ausentes con un backend anterior (ver BATTLE_DEFAULTS en utils/showdown).
  battleGameType?: BattleGameType;
  pickedTeamSize?: number;  // 1-6; 6 = se juega con todos
  teamSheet?: TeamSheet;
  bestOf?: number;          // 1 o 3
}

export type BattleGameType = 'SINGLES' | 'DOUBLES';
export type TeamSheet = 'OPEN' | 'CLOSED';

export const getLeagueSettings = async (leagueId: string): Promise<LeagueSettings> => {
  const { data } = await apiClient.get<LeagueSettings>(`/v1/leagues/${leagueId}/settings`);
  return data;
};

export const updateLeagueSettings = async (
  leagueId: string,
  settings: LeagueSettings
): Promise<void> => {
  await apiClient.put(`/v1/leagues/${leagueId}/settings`, settings);
};

// ── Coins ─────────────────────────────────────────────────────────────────────

export interface CoinBalanceResponse {
  coins: number;
}

export const getMyCoinBalance = async (leagueId: string): Promise<CoinBalanceResponse> => {
  const { data } = await apiClient.get<CoinBalanceResponse>(`/v1/leagues/${leagueId}/my-coins`);
  return data;
};

// ── Schedule ──────────────────────────────────────────────────────────────────

export interface MatchDto {
  id: string;
  player1: string;
  player2: string;
  winnerUsername?: string;
  status: 'PENDING' | 'COMPLETED';
  /** Marcador desde el punto de vista del ganador; ausente si no se indicó. */
  winnerScore?: number | null;
  loserScore?: number | null;
  // Alineación del partido; ausentes con un backend anterior.
  player1LineupSubmitted?: boolean;
  player2LineupSubmitted?: boolean;
  /** La propia siempre; la del rival solo cuando están las dos (reveladas). */
  player1Lineup?: Lineup | null;
  player2Lineup?: Lineup | null;
  /** El usuario en sesión puede declarar (o cambiar) su alineación ahora (lo decide el backend). */
  lineupOpen?: boolean;
  /** Podrá declararla cuando cierre el mercado de la jornada (lo decide el backend con la hora de Madrid). */
  lineupPending?: boolean;
  /** Replays de Showdown con los que se importó el resultado, en orden de partida; ausente si fue a mano. */
  replayIds?: string[] | null;
  /** Avisos del import (lo que se llevó fuera de la alineación). */
  importWarnings?: string[] | null;
}

/** Un replay de Showdown que podría ser una partida del partido (lo evalúa el backend). */
export interface ReplayCandidate {
  id: string;
  url: string;
  /** Epoch en segundos. */
  uploadtime: number;
  /** Usuario de la liga que ganó esa partida. */
  winnerUsername?: string | null;
  seriesId?: string | null;
  gameNumber?: number | null;
  selectable: boolean;
  /** Por qué no se puede usar. */
  reason?: string | null;
  warnings?: string[];
}

export const getReplayCandidates = async (
  leagueId: string,
  matchId: string,
  url?: string
): Promise<ReplayCandidate[]> => {
  const { data } = await apiClient.get<ReplayCandidate[]>(
    `/v1/leagues/${leagueId}/schedule/matches/${matchId}/replays`,
    { params: url ? { url } : undefined }
  );
  return data;
};

export const importSeries = async (leagueId: string, matchId: string, replayIds: string[]): Promise<void> => {
  await apiClient.post(`/v1/leagues/${leagueId}/schedule/matches/${matchId}/import`, { replayIds });
};

export interface Lineup {
  pokemonNames: string[];
  /** Enlace al equipo completo (lista abierta). */
  pasteUrl?: string | null;
  /** Diferencias entre el paste y la alineación (no bloquean). */
  pasteWarnings?: string[];
}

export interface JornadaDto {
  roundNumber: number;
  matches: MatchDto[];
  startDate?: string;       // "YYYY-MM-DD"
  stealDeadline?: string;   // ISO datetime "YYYY-MM-DDTHH:mm:ss"
  swapDeadline?: string;    // ISO datetime "YYYY-MM-DDTHH:mm:ss"
  /** Desde cuándo se puede declarar la alineación (cierre del mercado); null sin fecha. */
  lineupOpensAt?: string | null;
}

export const declareLineup = async (
  leagueId: string,
  matchId: string,
  pokemonNames: string[],
  pasteUrl?: string
): Promise<void> => {
  await apiClient.put(`/v1/leagues/${leagueId}/schedule/matches/${matchId}/lineup`, { pokemonNames, pasteUrl });
};

export interface ScheduleResponse {
  leagueId: string;
  jornadas: JornadaDto[];
  /** Estado de las ventanas calculado por el backend (única fuente de verdad). */
  stealWindowOpen: boolean;
  swapWindowOpen: boolean;
}

export const getSchedule = async (leagueId: string): Promise<ScheduleResponse | null> => {
  const { data, status } = await apiClient.get<ScheduleResponse>(`/v1/leagues/${leagueId}/schedule`, {
    validateStatus: (s) => s === 200 || s === 204,
  });
  if (status === 204) return null;
  return data;
};

export const recordMatchResult = async (
  leagueId: string,
  matchId: string,
  winnerUsername: string,
  score: MatchScore | null = null
): Promise<void> => {
  await apiClient.post(`/v1/leagues/${leagueId}/schedule/matches/${matchId}/result`, { winnerUsername, ...score });
};

/**
 * Admin: cambia el ganador de un partido ya registrado (devuelve las monedas dadas y reparte las nuevas),
 * o solo el marcador si el ganador es el mismo (sin mover monedas).
 */
export const correctMatchResult = async (
  leagueId: string,
  matchId: string,
  winnerUsername: string,
  score: MatchScore | null = null
): Promise<void> => {
  await apiClient.put(`/v1/leagues/${leagueId}/schedule/matches/${matchId}/result`, { winnerUsername, ...score });
};

/** Admin: deshace el resultado; el partido vuelve a pendiente y se devuelven las monedas. */
export const revertMatchResult = async (leagueId: string, matchId: string): Promise<void> => {
  await apiClient.delete(`/v1/leagues/${leagueId}/schedule/matches/${matchId}/result`);
};

export interface PlayerStanding {
  username: string;
  played: number;
  wins: number;
  losses: number;
  coins: number;
  /** Suma de marcadores a favor/en contra (solo partidos con marcador) y diferencia: desempata tras las victorias. */
  scoreFor: number;
  scoreAgainst: number;
  scoreDiff: number;
}

export const getStandings = async (leagueId: string): Promise<PlayerStanding[]> => {
  const { data } = await apiClient.get<{ standings: PlayerStanding[] }>(`/v1/leagues/${leagueId}/standings`);
  return data.standings;
};

export const generateInviteLink = async (leagueId: string): Promise<{ token: string }> => {
  const res = await apiClient.post(`/v1/leagues/${leagueId}/invite/generate`);
  return res.data;
};

export interface RedeemInviteResponse {
  leagueId: string;
  /** Ya era miembro: no se ha añadido de nuevo. Opcional hasta que el backend lo devuelva. */
  alreadyMember?: boolean;
}

export const redeemInvite = async (token: string): Promise<RedeemInviteResponse> => {
  const res = await apiClient.post(`/v1/invite/${token}/redeem`);
  return res.data;
};

export const searchUsers = async (q: string, leagueId: string): Promise<string[]> => {
  const res = await apiClient.get('/v1/users/search', { params: { q, leagueId } });
  return res.data;
};

// ── Season Stats ──────────────────────────────────────────────────────────────

export interface PlayerSeasonStats {
  username: string;
  wins: number;
  losses: number;
  played: number;
  winPct: number;           // 0-100, división entera
  currentStreak: number;    // positivo = racha de victorias, negativo = derrotas
  mvpPokemon: string | null;
}

export const getSeasonStats = async (leagueId: string): Promise<PlayerSeasonStats[]> => {
  const { data } = await apiClient.get<{ players: PlayerSeasonStats[] }>(
    `/v1/leagues/${leagueId}/season-stats`
  );
  return data.players;
};

export const setMyMvp = async (leagueId: string, pokemonName: string): Promise<void> => {
  await apiClient.put(`/v1/leagues/${leagueId}/my-mvp`, { pokemonName });
};
