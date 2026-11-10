import { useEffect } from 'react';
import { useMatches } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getLeagueDetail } from '../api/leagues';
import { getDraftStatus } from '../api/pokemons';
import { useAuthStore } from '../store/authStore';
import { documentTitle, isMyDraftTurn } from '../utils/documentTitle';
import { useSectionTitle } from '../hooks/useSectionTitle';

export type { TitleHandle } from '../hooks/useSectionTitle';

/**
 * Título de la pestaña según la ruta: la sección (`handle.title` de la ruta más concreta que lo tenga) y,
 * dentro de una liga, su nombre. Usa las mismas query keys que `LeagueLayout`: no hace llamadas extra.
 */
export default function DocumentTitle() {
  const matches = useMatches();
  const username = useAuthStore((s) => s.username);
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

  const section = useSectionTitle();
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
