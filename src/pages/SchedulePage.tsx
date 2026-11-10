import { useSchedulePage } from './schedule/useSchedulePage';
import ScheduleModals from './schedule/ScheduleModals';
import ScheduleDesktopView from './schedule/ScheduleDesktopView';

export default function SchedulePage() {
  const model = useSchedulePage();
  return (
    <>
      <ScheduleDesktopView model={model} />
      <ScheduleModals model={model} />
    </>
  );
}
