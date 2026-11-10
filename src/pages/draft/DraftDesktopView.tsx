import { Link } from 'react-router-dom';
import TurnClock from '../../components/draft/TurnClock';
import { SkeletonTable } from '../../components/SkeletonTable';
import DraftBoard from '../../components/draft/DraftBoard';
import DraftPoolGrid from '../../components/draft/DraftPoolGrid';
import SetupTierBoard from '../../components/draftSetup/SetupTierBoard';
import Notice from '../../components/Notice';
import { coinsLabel } from '../../utils/coins';
import PushPrompt from '../../components/push/PushPrompt';
import type { DraftPageModel } from './useDraftPage';

/** Draft en escritorio: estadísticas, aviso de turno, rejilla del pool y tablero en una columna. */
export default function DraftDesktopView({ model }: { model: DraftPageModel }) {
  const {
    leagueId, username, setShowCancelModal, setDetailEntry, setPendingPick, favorites, toggleFavorite, secondsLeft, draft, isLoading, pool, totalRounds, isAdmin, availablePool, isMyTurn, history, draftInProgress, config, myRemaining, myTeamSize, iAmOut, board, tierByName, entryByName, spending, picking, statusLabel, statusClass,
  } = model;

  return (
    <main className="page-content">
      <div className="section-header">
        <h1 className="page-title">Draft</h1>
        <div className="section-actions">
          {isAdmin && draft?.status === 'IN_PROGRESS' && (
            <button className="btn-danger" onClick={() => setShowCancelModal(true)}>
              Cancelar draft
            </button>
          )}
        </div>
      </div>

      {(draft?.status === 'PENDING' || draft?.status === 'IN_PROGRESS') && <PushPrompt context="draft" />}

      {isLoading && <SkeletonTable rows={5} />}
      {!isLoading && !draft && (
        <div className="empty-state">
          <p>No hay draft activo en esta liga.</p>
          <p style={{ marginTop: '0.4rem' }}>El admin debe prepararlo desde Miembros.</p>
        </div>
      )}

      {draft && (
        <div className="draft-status-bar">
          <div>
            <div className="draft-stat-label">Estado</div>
            <div className={`draft-stat-value ${statusClass}`}>{statusLabel}</div>
          </div>
          {draft.status === 'IN_PROGRESS' && (
            <div>
              <div className="draft-stat-label">Turno actual</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div className="draft-stat-value accent">{draft.currentTurn}</div>
                {secondsLeft !== null && <TurnClock secondsLeft={secondsLeft} />}
              </div>
            </div>
          )}
          {draft.status === 'IN_PROGRESS' && (
            <div>
              <div className="draft-stat-label">Ronda</div>
              <div className="draft-stat-value">{draft.currentRound}</div>
            </div>
          )}
          <div>
            <div className="draft-stat-label">Picks del draft</div>
            <div className="draft-stat-value">
              {draftInProgress
                ? `${history.length} de ${draft.turnOrder.length * totalRounds}`
                : history.length}
            </div>
          </div>
          {myRemaining !== null && draftInProgress && (
            <div>
              <div className="draft-stat-label">Te quedan</div>
              <div className="draft-stat-value">{myRemaining} 🪙</div>
            </div>
          )}
        </div>
      )}

      {draft?.status === 'PENDING' && (
        <>
          {isAdmin ? (
            <Link className="btn-primary" to={`/leagues/${leagueId}/draft/setup`}>Continuar la preparación</Link>
          ) : (
            <Notice variant="info">El admin está preparando el draft</Notice>
          )}
          {config && (
            <>
              <p className="section-label">
                Presupuesto: {coinsLabel(config.budget)}{config.snake ? ' · snake' : ''}
              </p>
              <SetupTierBoard pool={pool} config={config} readOnly />
            </>
          )}
        </>
      )}

      {draftInProgress && iAmOut && (
        <Notice variant="info">
          {myTeamSize >= totalRounds
            ? 'Tu draft ha terminado: tienes el equipo completo'
            : 'Tu draft ha terminado: no te llega para ningún Pokémon libre'}
        </Notice>
      )}

      {draftInProgress && draft && (
        <>
          {!iAmOut && (isMyTurn ? (
            <div className="my-turn-banner animate-in">
              <span className="my-turn-dot" />
              ⚡ ¡Es tu turno! Elige un Pokémon del pool
            </div>
          ) : (
            <p style={{ color: 'var(--text-2)', fontSize: '0.9rem' }}>
              Esperando el turno de <strong style={{ color: 'var(--accent)' }}>{draft.currentTurn}</strong>.
              Mientras, puedes ir mirando el pool y marcar tus favoritos ☆.
            </p>
          ))}
          {/* Visible todo el draft: fuera de tu turno solo se consulta; en tu turno, además, se elige */}
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
        </>
      )}

      {board && (history.length > 0 || draftInProgress) && (
        <div style={{ marginTop: '2.5rem' }}>
          <p className="section-label">Tablero</p>
          <DraftBoard
            board={board}
            me={username}
            tierByName={tierByName}
            onSelect={(name) => setDetailEntry(entryByName.get(name) ?? null)}
            budgets={draft?.budgets}
            spending={spending}
          />
        </div>
      )}

      {draft?.status === 'COMPLETED' && history.length === 0 && (
        <div style={{ marginTop: '2rem' }}>
          <Notice variant="info">
            Esta liga se drafteó antes de que se guardara el historial del draft, así que no hay tablero.
          </Notice>
          <Link className="btn-ghost" to={`/leagues/${leagueId}/teams`}>Ver equipos</Link>
        </div>
      )}
    </main>
  );
}
