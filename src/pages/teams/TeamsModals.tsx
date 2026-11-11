import PokemonDetailModal from '../../components/PokemonDetailModal';
import ProposeTradeModal from '../../components/ProposeTradeModal';
import TradesModal from '../../components/TradesModal';
import BenchActionModal from '../../components/teams/BenchActionModal';
import SwapModal from '../../components/teams/SwapModal';
import RivalActionModal from '../../components/teams/RivalActionModal';
import StealModal from '../../components/teams/StealModal';
import SetPriceModal from '../../components/teams/SetPriceModal';
import ReleaseModal from '../../components/teams/ReleaseModal';
import { releaseReward } from '../../utils/tiers';
import type { TeamsPageModel } from './useTeamsPage';

/** Modales de Equipos (robar, intercambiar, banquillo, precio, liberar, intercambios, ficha). Igual en escritorio y móvil. */
export default function TeamsModals({ model }: { model: TeamsPageModel }) {
  const {
    leagueId, username, modalBench, setModalBench, benchGoingToSwap, setBenchGoingToSwap, rivalModalPick, setRivalModalPick, rivalGoingToSteal, setRivalGoingToSteal, modalSetPrice, setModalSetPrice, releaseModalPick, setReleaseModalPick, showTradesModal, setShowTradesModal, modalProposeTrade, setModalProposeTrade, detailEntry, setDetailEntry, tierByName, leagueSettings, swapWindowClosed, effectiveStealPrice, doSwap, swapping, doSteal, stealing, doSetPrice, settingPrice, doBuy, buying, doRelease, releasing, myTeam, myBalance,
  } = model;

  return (
    <>
    {/* Bench action modal — choose swap or buy */}
    {modalBench && myTeam && !benchGoingToSwap && (
      <BenchActionModal
        benchEntry={modalBench}
        myPicks={myTeam.picks}
        myBalance={myBalance}
        tierByName={tierByName}
        buying={buying}
        onChooseSwap={() => setBenchGoingToSwap(true)}
        onBuyConfirm={() => doBuy(modalBench.pokemonName)}
        onClose={() => { setModalBench(null); setBenchGoingToSwap(false); }}
      />
    )}

    {/* Swap modal — shown after choosing Intercambiar */}
    {modalBench && myTeam && benchGoingToSwap && (
      <SwapModal
        benchEntry={modalBench}
        myPicks={myTeam.picks}
        myBalance={myBalance}
        tierByName={tierByName}
        leagueSettings={leagueSettings}
        swapping={swapping}
        onConfirm={(give) => doSwap({ give, take: modalBench.pokemonName })}
        onClose={() => { setModalBench(null); setBenchGoingToSwap(false); }}
        onBack={() => setBenchGoingToSwap(false)}
      />
    )}

    {/* Rival action modal — choose steal or propose trade */}
    {rivalModalPick && !rivalGoingToSteal && (
      <RivalActionModal
        pick={rivalModalPick.pick}
        responder={rivalModalPick.responder}
        stealPrice={effectiveStealPrice(rivalModalPick.pick)}
        myBalance={myBalance}
        tierByName={tierByName}
        onChooseSteal={() => setRivalGoingToSteal(true)}
        onChooseTrade={() => {
          setModalProposeTrade({
            responder: rivalModalPick.responder,
            responderPokemon: { name: rivalModalPick.pick.pokemonName, id: rivalModalPick.pick.pokemonId },
          });
          setRivalModalPick(null);
        }}
        onClose={() => setRivalModalPick(null)}
      />
    )}

    {/* Steal modal — shown after choosing Robar in RivalActionModal */}
    {rivalModalPick && rivalGoingToSteal && (
      <StealModal
        pick={rivalModalPick.pick}
        stealPrice={effectiveStealPrice(rivalModalPick.pick)}
        myBalance={myBalance}
        tierByName={tierByName}
        stealing={stealing}
        onConfirm={() => doSteal(rivalModalPick.pick.pokemonName)}
        onClose={() => { setRivalModalPick(null); setRivalGoingToSteal(false); }}
        onBack={() => setRivalGoingToSteal(false)}
      />
    )}

    {/* Set price modal */}
    {modalSetPrice && (
      <SetPriceModal
        pick={modalSetPrice}
        currentPrice={effectiveStealPrice(modalSetPrice)}
        myBalance={myBalance}
        tierByName={tierByName}
        saving={settingPrice}
        onConfirm={(newPrice) => doSetPrice({ pokemonName: modalSetPrice.pokemonName, newPrice })}
        onClose={() => setModalSetPrice(null)}
      />
    )}

    {/* Release modal */}
    {releaseModalPick && (
      <ReleaseModal
        pick={releaseModalPick}
        rewardCoins={releaseReward(leagueSettings, tierByName.get(releaseModalPick.pokemonName))}
        currentCoins={myBalance}
        tierByName={tierByName}
        releasing={releasing}
        onConfirm={() => doRelease(releaseModalPick.pokemonName)}
        onClose={() => setReleaseModalPick(null)}
      />
    )}

    {/* Trades inbox modal */}
    {showTradesModal && (
      <TradesModal
        leagueId={leagueId!}
        currentUsername={username!}
        onClose={() => setShowTradesModal(false)}
      />
    )}

    {/* Propose trade modal */}
    {modalProposeTrade && myTeam && (
      <ProposeTradeModal
        leagueId={leagueId!}
        responder={modalProposeTrade.responder}
        responderPokemon={modalProposeTrade.responderPokemon}
        myTeam={myTeam.picks.map((p) => ({ name: p.pokemonName, id: p.pokemonId }))}
        marketOpen={!swapWindowClosed}
        onClose={() => setModalProposeTrade(null)}
      />
    )}

    {detailEntry && (
      <PokemonDetailModal
        pokemonId={detailEntry.pokemonId}
        pokemonName={detailEntry.pokemonName}
        tier={detailEntry.tier}
        stats={detailEntry.stats}
        types={detailEntry.types}
        onClose={() => setDetailEntry(null)}
      />
    )}
    </>
  );
}
