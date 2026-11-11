import { useLayoutMode } from '../hooks/useLayoutMode';
import { useSchedulePage } from './schedule/useSchedulePage';
import ScheduleModals from './schedule/ScheduleModals';
import ScheduleDesktopView from './schedule/ScheduleDesktopView';
import ScheduleMobileView from './schedule/ScheduleMobileView';

export default function SchedulePage() {
  const model = useSchedulePage();
  const mobile = useLayoutMode() === 'mobile';
  return (
    <>
      {mobile ? <ScheduleMobileView model={model} /> : <ScheduleDesktopView model={model} />}
      <ScheduleModals model={model} />
    </>
  );
}
