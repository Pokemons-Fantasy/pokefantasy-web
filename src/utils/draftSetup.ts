import type { DraftConfigPayload } from '../api/pokemons';

/** Formulario de la preparación del draft: lo que se guarda con PUT draft/config. */
export type SetupForm = DraftConfigPayload;

const PRICES = ['priceS', 'priceA', 'priceB', 'priceC', 'priceD'] as const;

export function sameSetup(a: SetupForm, b: SetupForm): boolean {
  return a.budget === b.budget
    && PRICES.every((k) => a[k] === b[k])
    && a.snake === b.snake
    && a.turnOrder.length === b.turnOrder.length
    && a.turnOrder.every((u, i) => u === b.turnOrder[i]);
}

/** Mismas reglas que UpdateDraftConfigCommandHandler, para avisar antes de enviar. */
export function setupError(form: SetupForm): string | null {
  if (!(form.budget > 0)) return 'El presupuesto tiene que ser mayor que 0';
  if (PRICES.some((k) => form[k] < 0)) return 'Los precios no pueden ser negativos';
  if (PRICES.some((k) => !Number.isInteger(form[k])) || !Number.isInteger(form.budget)) {
    return 'Los precios tienen que ser números enteros';
  }
  return null;
}
