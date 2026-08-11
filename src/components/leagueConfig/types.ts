import type { LeagueSettings } from '../../api/leagues';

export type SetField = <K extends keyof LeagueSettings>(key: K, value: LeagueSettings[K]) => void;

export interface SectionProps {
  form: LeagueSettings;
  setField: SetField;
  disabled: boolean;
}
