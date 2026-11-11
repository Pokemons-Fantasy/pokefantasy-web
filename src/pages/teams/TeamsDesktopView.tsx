import { SkeletonGrid } from '../../components/SkeletonGrid';
import OwnTeamPanel from '../../components/teams/OwnTeamPanel';
import RivalTeamsList from '../../components/teams/RivalTeamsList';
import TeamFilterBar from '../../components/teams/TeamFilterBar';
import BenchSection from '../../components/teams/BenchSection';
import MarketStatus from '../../components/teams/MarketStatus';
import { toggleTier } from '../../utils/tiers';
import type { TeamsPageModel } from './useTeamsPage';

/** Equipos en escritorio: tu equipo fijo arriba, filtros, rivales y banquillo en una columna. */
export default function TeamsDesktopView({ model }: { model: TeamsPageModel }) {
  const {
    username, setRivalModalPick, setModalSetPrice, setReleaseModalPick, ownTeamCollapsed, setOwnTeamCollapsed, filterName, setFilterName, filterTiers, setFilterTiers, setShowTradesModal, setModalProposeTrade, copiedTeam, setDetailEntry, draft, isLoading, bench, tierByName, entryByName, myCoins, leagueSettings, maxTeamSize, schedule, pendingIncomingCount, stealWindowOpen, swapWindowClosed, effectiveStealPrice, exportTeamToShowdown, teams, myTeam, isDraftCompleted, myBalance, filterActive, filteredRivals, handleBenchCardClick, showDetail,
  } = model;

  return (
    <main className="page-content">
      <div className="section-header">
        <h1 className="page-title">Equipos</h1>
        {isDraftCompleted && (
          <button
            className="btn-ghost"
            style={{ position: 'relative' }}
            onClick={() => setShowTradesModal(true)}
          >
            Intercambios
            {pendingIncomingCount > 0 && (
              <span style={{
                position: 'absolute', top: -6, right: -6,
                background: 'var(--accent-fill)', color: '#0a0a0f',
                fontSize: '0.65rem', fontWeight: 700,
                borderRadius: '50%', width: 18, height: 18,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {pendingIncomingCount}
              </span>
            )}
          </button>
        )}
      </div>

      {isLoading && <SkeletonGrid count={6} />}

      {!isLoading && !draft && (
        <div className="empty-state">
          <p>No hay draft en esta liga.</p>
        </div>
      )}

      {isDraftCompleted && schedule && <MarketStatus schedule={schedule} />}

      {draft && teams.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem', marginTop: '1.5rem' }}>
          {myTeam && (
            <OwnTeamPanel
              team={myTeam}
              maxTeamSize={maxTeamSize}
              myCoins={myCoins?.coins}
              isDraftCompleted={isDraftCompleted}
              collapsed={ownTeamCollapsed}
              onToggleCollapse={() => setOwnTeamCollapsed((c) => !c)}
              copied={copiedTeam === myTeam.username}
              onExportShowdown={() => exportTeamToShowdown(myTeam.picks, myTeam.username)}
              tierByName={tierByName}
              stealWindowOpen={stealWindowOpen}
              swapWindowClosed={swapWindowClosed}
              effectiveStealPrice={effectiveStealPrice}
              onRaisePrice={(pick) => setModalSetPrice(pick)}
              onRelease={(pick) => setReleaseModalPick(pick)}
              onInfo={showDetail}
            />
          )}

          {teams.some((t) => t.username !== username) && (
            <TeamFilterBar
              filterName={filterName}
              onFilterNameChange={setFilterName}
              filterTiers={filterTiers}
              onToggleTier={(tier) => setFilterTiers((prev) => toggleTier(prev, tier))}
              onClear={() => { setFilterName(''); setFilterTiers(new Set()); }}
              filterActive={filterActive}
              filteredTeamCount={filteredRivals.length}
              filteredPokemonCount={filteredRivals.reduce((acc, t) => acc + t.picks.length, 0)}
            />
          )}

          <RivalTeamsList
            teams={filteredRivals}
            filterActive={filterActive}
            maxTeamSize={maxTeamSize}
            isDraftCompleted={isDraftCompleted}
            copiedTeam={copiedTeam}
            onExportShowdown={(team) => exportTeamToShowdown(team.picks, team.username)}
            tierByName={tierByName}
            stealWindowOpen={stealWindowOpen}
            swapWindowOpen={!swapWindowClosed}
            effectiveStealPrice={effectiveStealPrice}
            myBalance={myBalance}
            onInfo={showDetail}
            onSteal={(pick, responder) => setRivalModalPick({ pick, responder })}
            onProposeTrade={(pick, responder) => setModalProposeTrade({
              responder,
              responderPokemon: { name: pick.pokemonName, id: pick.pokemonId },
            })}
          />
        </div>
      )}

      {isDraftCompleted && (
        <BenchSection
          bench={bench}
          swapWindowClosed={swapWindowClosed}
          canInteract={!!myTeam}
          myBalance={myBalance}
          myPicks={myTeam?.picks ?? []}
          leagueSettings={leagueSettings}
          tierByName={tierByName}
          entryByName={entryByName}
          onCardClick={handleBenchCardClick}
          onInfo={setDetailEntry}
        />
      )}
    </main>
  );
}
