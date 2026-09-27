import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RivalTeamsList from './RivalTeamsList';
import type { DraftPick, Tier } from '../../api/pokemons';

const pick = (username: string, pokemonName: string): DraftPick => ({
  username, pokemonName, pokemonId: 1, round: 1, pickedAt: '2026-09-01T10:00:00Z',
});

const TEAMS = [
  { username: 'brock', picks: [pick('brock', 'onix'), pick('brock', 'geodude'), pick('brock', 'snorlax')] },
  { username: 'misty', picks: [pick('misty', 'starmie')] },
];
const TIERS = new Map<string, Tier>([['onix', 'D'], ['geodude', 'D'], ['snorlax', 'S'], ['starmie', 'B']]);

function renderList(filterActive = false) {
  render(
    <RivalTeamsList
      teams={TEAMS}
      filterActive={filterActive}
      maxTeamSize={10}
      isDraftCompleted
      copiedTeam={null}
      onExportShowdown={vi.fn()}
      tierByName={TIERS}
      stealWindowOpen={false}
      swapWindowOpen={false}
      effectiveStealPrice={() => 1}
      myBalance={100}
      onInfo={vi.fn()}
      onSteal={vi.fn()}
      onProposeTrade={vi.fn()}
    />,
  );
}

describe('RivalTeamsList', () => {
  it('los rivales empiezan plegados y muestran su resumen', () => {
    renderList();
    const brock = screen.getByRole('button', { name: /brock/ });
    expect(brock).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('onix')).not.toBeInTheDocument();
    expect(screen.getByText('3/10')).toBeInTheDocument();
    expect(screen.getByLabelText('Por tier: 1 S, 2 D')).toBeInTheDocument();
  });

  it('pulsar la cabecera despliega ese equipo', async () => {
    renderList();
    await userEvent.click(screen.getByRole('button', { name: /brock/ }));
    expect(screen.getByRole('button', { name: /brock/ })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('onix')).toBeInTheDocument();
    expect(screen.queryByText('starmie')).not.toBeInTheDocument();
  });

  it('Desplegar todos y Plegar todos', async () => {
    renderList();
    await userEvent.click(screen.getByRole('button', { name: 'Desplegar todos' }));
    expect(screen.getByText('onix')).toBeInTheDocument();
    expect(screen.getByText('starmie')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Plegar todos' }));
    expect(screen.queryByText('onix')).not.toBeInTheDocument();
  });

  it('con un filtro activo los resultados se ven sin desplegar a mano', () => {
    renderList(true);
    expect(screen.getByText('onix')).toBeInTheDocument();
    expect(screen.getByText('starmie')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Desplegar todos' })).not.toBeInTheDocument();
  });

  it('con el mercado cerrado, proponer avisa de que se aceptará cuando abra', async () => {
    renderList(true);
    const card = screen.getByText('onix').closest('.pokemon-card');
    expect(card).toHaveAttribute('title', 'Proponer intercambio: se podrá aceptar cuando abra el mercado');
  });
});
