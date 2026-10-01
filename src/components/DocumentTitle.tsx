import { useEffect } from 'react';
import { useMatches, type Params } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getLeagueDetail } from '../api/leagues';
import { getDraftStatus } from '../api/pokemons';
import { useAuthStore } from '../store/authStore';
import { documentTitle, isMyDraftTurn } from '../utils/documentTitle';

/** `handle` de una ruta del router: la sección que va en el título de la pestaña. */
export interface TitleHandle {
  title: string | ((params: Params) => string);
}

/**
 * Título de la pestaña según la ruta: la sección (`handle.title` de la ruta más concreta que lo tenga) y,
 * dentro de una liga, su nombre. Usa las mismas query keys que `LeagueLayout`: no hace llamadas extra.
 */
export default function DocumentTitle() {
  const matches = useMatches();
  const username = useAuthStore((s) => s.username);
  const titled = [...matches].reverse().find((m) => (m.handle as TitleHandle | undefined)?.title);
  const leagueId = matches.at(-1)?.params.leagueId;

  const { data: league } = useQuery({
    queryKey: ['league-detail', leagueId],
    queryFn: () => getLeagueDetail(leagueId!),
    enabled: !!leagueId && !!username,
  });
  const { data: draft } = useQuery({
    queryKey: ['draft-status', leagueId],
    queryFn: () => getDraftStatus(leagueId!),
    enabled: !!leagueId && !!username,
  });

  const handleTitle = (titled?.handle as TitleHandle | undefined)?.title;
  const section = typeof handleTitle === 'function' ? handleTitle(titled!.params) : handleTitle;
  const title = documentTitle({
    section,
    league: leagueId ? league?.name : null,
    myTurn: !!leagueId && isMyDraftTurn(draft, username),
  });

  useEffect(() => {
    document.title = title;
  }, [title]);

  return null;
}
