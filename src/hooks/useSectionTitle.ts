import { useMatches } from 'react-router-dom';
import type { Params } from 'react-router-dom';

/** `handle` de una ruta del router: la sección que va en el título de la pestaña y en la app bar móvil. */
export interface TitleHandle {
  title: string | ((params: Params) => string);
}

/** Sección de la ruta actual: `handle.title` de la ruta más concreta que lo tenga. */
export function useSectionTitle(): string | undefined {
  const matches = useMatches();
  const titled = [...matches].reverse().find((m) => (m.handle as TitleHandle | undefined)?.title);
  const title = (titled?.handle as TitleHandle | undefined)?.title;
  return typeof title === 'function' ? title(titled!.params) : title;
}
