import { useSearchParams } from 'react-router-dom';
import SegmentedTabs from '../../components/shell/SegmentedTabs';
import DraftTurnBar from '../../components/draft/DraftTurnBar';
import DraftPoolGrid from '../../components/draft/DraftPoolGrid';
import DraftPlayerBoard from '../../components/draft/DraftPlayerBoard';
import PushPrompt from '../../components/push/PushPrompt';
import Notice from '../../components/Notice';
import DraftDesktopView from './DraftDesktopView';
import type { DraftPageModel } from './useDraftPage';
import styles from './DraftMobileView.module.css';

type View = 'elegir' | 'tablero';
const VIEWS: { value: View; label: string }[] = [
  { value: 'elegir', label: 'Elegir' },
  { value: 'tablero', label: 'Tablero' },
];

/**
 * Draft en móvil: con el draft en curso, barra de turno fija y sub-pestañas Elegir · Tablero (en la URL);
 * terminado, el tablero por jugador; en preparación o sin draft, igual que en escritorio.
 */
export default function DraftMobileView({ model }: { model: DraftPageModel }) {
  const {
    draft, board, history, draftInProgress, isMyTurn, iAmOut, isPlayer, secondsLeft, myRemaining, username,
    availablePool, config, picking, favorites, toggleFavorite, setPendingPick, setDetailEntry,
    tierByName, entryByName, spending, isAdmin, setShowCancelModal,
  } = model;
  const [params, setParams] = useSearchParams();

  const playerBoard = board && (
    <DraftPlayerBoard
      board={board}
      me={username}
      tierByName={tierByName}
      budgets={draft?.budgets}
      spending={spending}
      onSelect={(name) => setDetailEntry(entryByName.get(name) ?? null)}
    />
  );

  if (draft && !draftInProgress && board && history.length > 0) {
    return (
      <main className="page-content">
        <h1 className="sr-only">Draft</h1>
        {draft.status === 'CANCELLED' && <Notice variant="info">El draft se canceló: estos picks no cuentan.</Notice>}
        {playerBoard}
      </main>
    );
  }

  if (!draft || !draftInProgress) return <DraftDesktopView model={model} />;

  const canChoose = isPlayer && !iAmOut;
  const requested = params.get('vista');
  const view: View = requested === 'elegir' || requested === 'tablero' ? requested : canChoose ? 'elegir' : 'tablero';
  const selectView = (next: View) => setParams((prev) => {
    prev.set('vista', next);
    return prev;
  }, { replace: true });

  return (
    <main className={`page-content ${styles.page}`}>
      <h1 className="sr-only">Draft</h1>

      <DraftTurnBar
        currentTurn={draft.currentTurn}
        isMyTurn={isMyTurn}
        iAmOut={iAmOut}
        round={draft.currentRound}
        secondsLeft={secondsLeft}
        remaining={isPlayer ? myRemaining : null}
        onChoose={isMyTurn && !iAmOut && view === 'tablero' ? () => selectView('elegir') : undefined}
      />

      <PushPrompt context="draft" />

      <SegmentedTabs label="Secciones del draft" idPrefix="draft" options={VIEWS} value={view} onChange={selectView} />

      <div id="draft-panel" role="tabpanel" aria-labelledby={`draft-tab-${view}`}>
        {view === 'elegir' ? (
          <DraftPoolGrid
            entries={availablePool}
            config={config}
            remaining={myRemaining}
            canPick={isMyTurn && !iAmOut}
            picking={picking}
            favorites={favorites}
            onToggleFavorite={toggleFavorite}
            onPick={setPendingPick}
            onInfo={setDetailEntry}
          />
        ) : playerBoard}
      </div>

      {isAdmin && (
        <button type="button" className={`btn-danger ${styles.cancel}`} onClick={() => setShowCancelModal(true)}>
          Cancelar draft
        </button>
      )}
    </main>
  );
}
