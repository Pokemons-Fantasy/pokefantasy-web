/**
 * Comprobación en tiempo de compilación de que los tipos escritos a mano en `src/api/*.ts`
 * siguen cuadrando con la API del backend (`schema.d.ts`, generado desde `openapi.json` con
 * `npm run api:types`). No genera código: si el backend renombra o quita un campo, o añade un
 * valor a un enum que el frontend no contempla, `tsc` (y por tanto el build de Netlify) falla aquí
 * señalando el tipo y el campo.
 *
 * Solo se comparan campos primitivos (string/number/boolean y uniones de literales); los objetos
 * y listas anidados se comprueban con su propia entrada. En el esquema todos los campos son
 * opcionales (springdoc no marca `required`), así que la nulabilidad no se compara.
 */
import type { components } from './schema';
import type { ActivityEvent, ActivityFeedResponse } from './activity';
import type { LoginResponse } from './auth';
import type {
  CoinBalanceResponse, JornadaDto, League, LeagueDetail, LeagueMember, LeagueSettings,
  MatchDto, PlayerSeasonStats, PlayerStanding, RedeemInviteResponse, ScheduleResponse,
} from './leagues';
import type {
  AvailablePokemon, BenchEntry, DraftPick, DraftStatus, TierAdjustmentResponse, TierChange,
} from './pokemons';
import type { ProposeTradePayload, Trade } from './trades';

type S = components['schemas'];
type Primitive = string | number | boolean;

/** `true` si cada campo primitivo de `F` existe en `B` y todo valor del backend cabe en el de `F`. */
type FieldsMatch<F, B> = {
  [K in keyof F]-?: K extends keyof B
    ? NonNullable<F[K]> extends Primitive
      ? string extends NonNullable<B[K]>
        ? true // el backend lo documenta como string libre (p. ej. un enum serializado a mano)
        : [NonNullable<B[K]>] extends [NonNullable<F[K]>]
          ? true
          : ['el backend admite otros valores en', K]
      : true
    : ['el backend no tiene el campo', K];
}[keyof F];

type Assert<T extends true> = T;

export type Contract = [
  Assert<FieldsMatch<ActivityEvent, S['ActivityEventResponse']>>,
  Assert<FieldsMatch<ActivityFeedResponse, S['ActivityFeedResponse']>>,
  Assert<FieldsMatch<LoginResponse, S['LoginResponse']>>,
  Assert<FieldsMatch<League, S['LeagueResponse']>>,
  Assert<FieldsMatch<LeagueDetail, S['LeagueDetailResponse']>>,
  Assert<FieldsMatch<LeagueMember, S['LeagueMemberResponse']>>,
  Assert<FieldsMatch<LeagueSettings, S['LeagueSettingsResponse']>>,
  Assert<FieldsMatch<LeagueSettings, S['UpdateLeagueSettingsRequest']>>,
  Assert<FieldsMatch<CoinBalanceResponse, S['CoinBalanceResponse']>>,
  Assert<FieldsMatch<MatchDto, S['MatchResponse']>>,
  Assert<FieldsMatch<JornadaDto, S['JornadaResponse']>>,
  Assert<FieldsMatch<ScheduleResponse, S['ScheduleResponse']>>,
  Assert<FieldsMatch<PlayerStanding, S['PlayerStandingResponse']>>,
  Assert<FieldsMatch<PlayerSeasonStats, S['PlayerSeasonStats']>>,
  Assert<FieldsMatch<RedeemInviteResponse, S['RedeemInviteResponse']>>,
  Assert<FieldsMatch<AvailablePokemon, S['AvailablePokemonResponse']>>,
  Assert<FieldsMatch<BenchEntry, S['BenchEntryResponse']>>,
  Assert<FieldsMatch<DraftPick, S['DraftPickResponse']>>,
  Assert<FieldsMatch<DraftStatus, S['DraftStatusResponse']>>,
  Assert<FieldsMatch<TierChange, S['TierChangeDto']>>,
  Assert<FieldsMatch<TierAdjustmentResponse, S['TierAdjustmentResponse']>>,
  Assert<FieldsMatch<Trade, S['TradeResponse']>>,
  Assert<FieldsMatch<ProposeTradePayload, S['ProposeTradeRequest']>>,
];
