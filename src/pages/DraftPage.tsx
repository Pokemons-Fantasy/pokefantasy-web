import { useDraftPage } from './draft/useDraftPage';
import DraftModals from './draft/DraftModals';
import DraftDesktopView from './draft/DraftDesktopView';

export default function DraftPage() {
  const model = useDraftPage();
  return (
    <>
      <DraftDesktopView model={model} />
      <DraftModals model={model} />
    </>
  );
}
