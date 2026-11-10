import { useTeamsPage } from './teams/useTeamsPage';
import TeamsModals from './teams/TeamsModals';
import TeamsDesktopView from './teams/TeamsDesktopView';

export default function TeamsPage() {
  const model = useTeamsPage();
  return (
    <>
      <TeamsModals model={model} />
      <TeamsDesktopView model={model} />
    </>
  );
}
