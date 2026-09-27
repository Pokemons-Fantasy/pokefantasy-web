import type { DraftPick } from '../api/pokemons';

export interface BoardCell {
  username: string;
  /** null si ese jugador aún no ha elegido en esta ronda. */
  pick: DraftPick | null;
  /** Número global del pick (draft lineal: mismo orden de turnos en todas las rondas). */
  pickNumber: number;
  /** Casilla del jugador que tiene el turno ahora. */
  isCurrent: boolean;
  /** Dueño actual si el Pokémon cambió de manos (robo, trade); null si sigue con quien lo drafteó. */
  currentOwner: string | null;
}

export interface DraftBoardData {
  players: string[];
  rounds: { round: number; cells: BoardCell[] }[];
}

interface BuildDraftBoardInput {
  /** draftHistory: los picks tal como se hicieron, inmunes a robos y trades. */
  history: DraftPick[];
  turnOrder: string[];
  /** draft.picks: los equipos de ahora, para saber quién tiene cada Pokémon. */
  currentPicks?: DraftPick[];
  /** Rondas previstas (maxTeamSize) para pintar también las que faltan durante el draft. */
  totalRounds?: number;
  current?: { round: number; username: string | null } | null;
}

export function buildDraftBoard({
  history, turnOrder, currentPicks = [], totalRounds = 0, current = null,
}: BuildDraftBoardInput): DraftBoardData {
  const byRoundAndUser = new Map(history.map((p) => [`${p.round}|${p.username}`, p]));
  const ownerByPokemon = new Map(currentPicks.map((p) => [p.pokemonName, p.username]));
  const lastRound = Math.max(totalRounds, ...history.map((p) => p.round), 0);

  const rounds = Array.from({ length: lastRound }, (_, i) => {
    const round = i + 1;
    const cells = turnOrder.map((username, col): BoardCell => {
      const pick = byRoundAndUser.get(`${round}|${username}`) ?? null;
      const owner = pick ? ownerByPokemon.get(pick.pokemonName) : undefined;
      return {
        username,
        pick,
        pickNumber: i * turnOrder.length + col + 1,
        isCurrent: !pick && current?.round === round && current.username === username,
        currentOwner: owner && owner !== username ? owner : null,
      };
    });
    return { round, cells };
  });

  return { players: turnOrder, rounds };
}
