import PokemonDetailModal from '../../components/PokemonDetailModal';
import ConfirmDialog from '../../components/ConfirmDialog';
import Modal from '../../components/Modal';
import { coinsLabel } from '../../utils/coins';
import type { DraftPageModel } from './useDraftPage';

/** Modales del Draft (cancelar, confirmar pick, ficha). Igual en escritorio y móvil. */
export default function DraftModals({ model }: { model: DraftPageModel }) {
  const {
    showCancelModal, setShowCancelModal, detailEntry, setDetailEntry, pendingPick, setPendingPick, pickTitleId, pickMessageId, config, myRemaining, priceOf, tiered, pick, picking, cancel, cancelling,
  } = model;

  return (
    <>
    {showCancelModal && (
      <ConfirmDialog
        title="¿Cancelar el draft?"
        message="Se reabren las nominaciones y el pool pierde los tiers. Los picks hechos no cuentan: el siguiente draft empieza de cero."
        confirmLabel="Sí, cancelar el draft"
        cancelLabel="Seguir con el draft"
        pendingLabel="Cancelando..."
        pending={cancelling}
        danger
        onConfirm={() => cancel()}
        onClose={() => setShowCancelModal(false)}
      />
    )}
    {pendingPick && (
      <Modal labelledBy={pickTitleId} describedBy={pickMessageId} role="alertdialog" onClose={() => setPendingPick(null)}>
        <h2 id={pickTitleId}>¿Confirmar pick?</h2>
        <p id={pickMessageId} style={{ fontSize: '0.875rem', color: 'var(--text-2)' }}>
          Vas a elegir a <strong>{pendingPick.pokemonName}</strong>
          {config && myRemaining !== null && (
            <> por {coinsLabel(priceOf(pendingPick))}: te quedarán {coinsLabel(myRemaining - priceOf(pendingPick))}</>
          )}. Esta acción no se puede deshacer.
        </p>
        <div className="modal-actions">
          <button className="btn-ghost" onClick={() => setPendingPick(null)}>
            Cancelar
          </button>
          <button
            className="btn-primary"
            disabled={picking}
            onClick={() => {
              pick(pendingPick.pokemonName);
              setPendingPick(null);
            }}
          >
            {picking ? 'Eligiendo...' : 'Confirmar'}
          </button>
        </div>
      </Modal>
    )}
    {detailEntry && (
      <PokemonDetailModal
        pokemonId={detailEntry.pokemonId}
        pokemonName={detailEntry.pokemonName}
        tier={tiered ? detailEntry.tier : undefined}
        stats={detailEntry.stats}
        types={detailEntry.types}
        onClose={() => setDetailEntry(null)}
      />
    )}
    </>
  );
}
