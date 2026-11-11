import { useLayoutMode } from '../hooks/useLayoutMode';
import { useTeamsPage } from './teams/useTeamsPage';
import TeamsModals from './teams/TeamsModals';
import TeamsDesktopView from './teams/TeamsDesktopView';
import TeamsMobileView from './teams/TeamsMobileView';

export default function TeamsPage() {
  const model = useTeamsPage();
  const mobile = useLayoutMode() === 'mobile';
  return (
    <>
      <TeamsModals model={model} />
      {mobile ? <TeamsMobileView model={model} /> : <TeamsDesktopView model={model} />}
    </>
  );
}
