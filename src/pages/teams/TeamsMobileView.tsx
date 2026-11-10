import { useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useNow } from '../../hooks/useNow';
import { teamsSummary } from '../../utils/teamsSummary';
import { toggleTier } from '../../utils/tiers';
import SegmentedTabs from '../../components/shell/SegmentedTabs';
import TeamsSummaryCard from '../../components/teams/TeamsSummaryCard';
import OwnTeamGrid from '../../components/teams/OwnTeamGrid';
import TeamFilterBar from '../../components/teams/TeamFilterBar';
import RivalTeamsList from '../../components/teams/RivalTeamsList';
import BenchSection from '../../components/teams/BenchSection';
import TeamsDesktopView from './TeamsDesktopView';
import type { TeamsPageModel } from './useTeamsPage';
import styles from './TeamsMobileView.module.css';

type View = 'equipo' | 'rivales' | 'banquillo';

const LABELS: Record<View, string> = { equipo: 'Mi equipo', rivales: 'Rivales', banquillo: 'Banquillo' };

/** Equipos en móvil: resumen de la jornada arriba y sub-pestañas Mi equipo · Rivales · Banquillo (en la URL). */
export default function TeamsMobileView({ model }: { model: TeamsPageModel }) {
  const username = useAuthStore((s) => s.username) ?? '';
  const now = useNow();
  const [params, setParams] = useSearchParams();

  // Antes de acabar el draft no hay mercado ni banquillo: se ve igual que en escritorio
  if (!model.isDraftCompleted) return <TeamsDesktopView model={model} />;

  const views: View[] = model.myTeam ? ['equipo', 'rivales', 'banquillo'] : ['rivales', 'banquillo'];
  const requested = params.get('vista') as View | null;
  const view: View = requested && views.includes(requested) ? requested : views[0];
  const summary = teamsSummary(model.schedule, username, now);
  const activeTab = `equipos-tab-${view}`;

  return (
    <main className={`page-content ${styles.page}`}>
      <h1 className="sr-only">Equipos</h1>

      {summary && (
        <TeamsSummaryCard
          summary={summary}
          coins={model.myCoins?.coins}
          pendingTrades={model.pendingIncomingCount}
          onOpenTrades={() => model.setShowTradesModal(true)}
        />
      )}

      <SegmentedTabs
        label="Secciones de Equipos"
        idPrefix="equipos"
        options={views.map((value) => ({ value, label: LABELS[value] }))}
        value={view}
        onChange={(next) => setParams({ vista: next }, { replace: true })}
      />

      <div id="equipos-panel" role="tabpanel" aria-labelledby={activeTab} className={styles.panel}>
        {view === 'equipo' && model.myTeam && (
          <>
            <div className={styles.teamHeader}>
              <span>{model.myTeam.picks.length}/{model.maxTeamSize} Pokémon</span>
              {model.myTeam.picks.length > 0 && (
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => model.exportTeamToShowdown(model.myTeam!.picks, model.myTeam!.username)}
                >
                  {model.copiedTeam === model.myTeam.username ? '✓ Copiado' : 'Copiar para Showdown'}
                </button>
              )}
            </div>
            <OwnTeamGrid
              team={model.myTeam}
              tierByName={model.tierByName}
              isDraftCompleted={model.isDraftCompleted}
              stealWindowOpen={model.stealWindowOpen}
              swapWindowClosed={model.swapWindowClosed}
              effectiveStealPrice={model.effectiveStealPrice}
              onRaisePrice={model.setModalSetPrice}
              onRelease={model.setReleaseModalPick}
              onInfo={model.showDetail}
            />
          </>
        )}

        {view === 'rivales' && (
          <>
            <TeamFilterBar
              filterName={model.filterName}
              onFilterNameChange={model.setFilterName}
              filterTiers={model.filterTiers}
              onToggleTier={(tier) => model.setFilterTiers((prev) => toggleTier(prev, tier))}
              onClear={() => { model.setFilterName(''); model.setFilterTiers(new Set()); }}
              filterActive={model.filterActive}
              filteredTeamCount={model.filteredRivals.length}
              filteredPokemonCount={model.filteredRivals.reduce((acc, t) => acc + t.picks.length, 0)}
            />
            <RivalTeamsList
              teams={model.filteredRivals}
              filterActive={model.filterActive}
              maxTeamSize={model.maxTeamSize}
              isDraftCompleted={model.isDraftCompleted}
              copiedTeam={model.copiedTeam}
              onExportShowdown={(team) => model.exportTeamToShowdown(team.picks, team.username)}
              tierByName={model.tierByName}
              stealWindowOpen={model.stealWindowOpen}
              swapWindowOpen={!model.swapWindowClosed}
              effectiveStealPrice={model.effectiveStealPrice}
              myBalance={model.myBalance}
              onInfo={model.showDetail}
              onSteal={(pick, responder) => model.setRivalModalPick({ pick, responder })}
              onProposeTrade={(pick, responder) => model.setModalProposeTrade({
                responder,
                responderPokemon: { name: pick.pokemonName, id: pick.pokemonId },
              })}
            />
          </>
        )}

        {view === 'banquillo' && (
          <BenchSection
            bench={model.bench}
            swapWindowClosed={model.swapWindowClosed}
            canInteract={!!model.myTeam}
            myBalance={model.myBalance}
            myPicks={model.myTeam?.picks ?? []}
            leagueSettings={model.leagueSettings}
            tierByName={model.tierByName}
            entryByName={model.entryByName}
            onCardClick={model.handleBenchCardClick}
            onInfo={model.setDetailEntry}
          />
        )}
      </div>
    </main>
  );
}
