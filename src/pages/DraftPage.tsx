import { useLayoutMode } from '../hooks/useLayoutMode';
import { useDraftPage } from './draft/useDraftPage';
import DraftModals from './draft/DraftModals';
import DraftDesktopView from './draft/DraftDesktopView';
import DraftMobileView from './draft/DraftMobileView';

export default function DraftPage() {
  const model = useDraftPage();
  const mobile = useLayoutMode() === 'mobile';
  return (
    <>
      {mobile ? <DraftMobileView model={model} /> : <DraftDesktopView model={model} />}
      <DraftModals model={model} />
    </>
  );
}
