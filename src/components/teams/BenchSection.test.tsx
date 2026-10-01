import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import BenchSection from './BenchSection';
import type { LeagueSettings } from '../../api/leagues';
import type { BenchEntry, DraftPick, Tier } from '../../api/pokemons';

const settings = { priceTierS: 500, priceTierA: 300, priceTierB: 150, priceTierC: 50, priceTierD: 0 } as LeagueSettings;
const bench = [
  { pokemonName: 'lapras', pokemonId: 131, tier: 'A', price: 300 },
  { pokemonName: 'pidgey', pokemonId: 16, tier: 'D', price: 0 },
] as BenchEntry[];
const myPicks = [{ username: 'ash', pokemonName: 'rattata', pokemonId: 19, round: 1 }] as DraftPick[];
const tiers = new Map<string, Tier>([['rattata', 'D'], ['lapras', 'A'], ['pidgey', 'D']]);

function renderBench(myBalance: number, swapWindowClosed = false) {
  render(
    <BenchSection bench={bench} swapWindowClosed={swapWindowClosed} canInteract myBalance={myBalance}
      myPicks={myPicks} leagueSettings={settings} tierByName={tiers} entryByName={new Map()}
      onCardClick={vi.fn()} onInfo={vi.fn()} />,
  );
}

describe('BenchSection: mejoras al alcance', () => {
  it('marca los de mejor tier que puedes conseguir entregando tu peor Pokémon', () => {
    renderBench(300);
    const chips = screen.getAllByTitle(/^Entregando a/);
    expect(chips).toHaveLength(1);
    expect(chips[0]).toHaveAttribute('title', 'Entregando a rattata pagas 300 monedas');
    expect(chips[0]).toHaveTextContent('⬆ Mejora−💰 300');
  });

  it('sin saldo para la diferencia no marca nada', () => {
    renderBench(299);
    expect(screen.queryByTitle(/^Entregando a/)).not.toBeInTheDocument();
  });

  it('con el mercado cerrado no marca nada', () => {
    renderBench(1000, true);
    expect(screen.queryByTitle(/^Entregando a/)).not.toBeInTheDocument();
  });
});
