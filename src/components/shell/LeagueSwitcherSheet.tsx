import { useId } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getMyLeagues } from '../../api/leagues';
import { SkeletonTable } from '../SkeletonTable';
import Sheet from './Sheet';
import { usePendingTrades } from './usePendingTrades';
import menu from './SheetMenu.module.css';

interface LeagueSwitcherSheetProps {
  currentLeagueId: string;
  onClose: () => void;
}

/** "Cambiar de liga": tus ligas, la actual marcada y los intercambios pendientes de cada una. */
export default function LeagueSwitcherSheet({ currentLeagueId, onClose }: LeagueSwitcherSheetProps) {
  const titleId = useId();
  const { data: leagues, isLoading } = useQuery({ queryKey: ['my-leagues'], queryFn: getMyLeagues, staleTime: 60_000 });
  const { byLeague } = usePendingTrades();

  return (
    <Sheet labelledBy={titleId} onClose={onClose}>
      <h2 id={titleId} className={menu.label}>Cambiar de liga</h2>
      {isLoading && <SkeletonTable rows={3} />}
      <nav className={menu.section} aria-labelledby={titleId}>
        {leagues?.map((league) => (
          <Link
            key={league.id}
            className={menu.item}
            to={`/leagues/${league.id}`}
            aria-current={league.id === currentLeagueId ? 'page' : undefined}
            onClick={onClose}
          >
            <span className={menu.itemText}>{league.name}</span>
            {!!byLeague.get(league.id) && <span className="badge badge-yellow">{byLeague.get(league.id)}</span>}
          </Link>
        ))}
        <Link className={menu.item} to="/leagues" onClick={onClose}>Ver Mis ligas</Link>
      </nav>
    </Sheet>
  );
}
