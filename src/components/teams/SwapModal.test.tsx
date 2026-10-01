import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SwapModal from './SwapModal';
import type { LeagueSettings } from '../../api/leagues';
import type { BenchEntry, DraftPick, Tier } from '../../api/pokemons';

const settings = { priceTierS: 500, priceTierA: 300, priceTierB: 150, priceTierC: 50, priceTierD: 0 } as LeagueSettings;
const lapras = { pokemonName: 'lapras', pokemonId: 131, tier: 'A', price: 300 } as BenchEntry;
const pick = (pokemonName: string, lockedUntil: string | null = null) =>
  ({ username: 'ash', pokemonName, pokemonId: 1, round: 1, lockedUntil }) as DraftPick;
const tiers = new Map<string, Tier>([['rattata', 'D'], ['mew', 'S'], ['onix', 'B']]);

function renderModal(myPicks: DraftPick[], myBalance: number, onConfirm = vi.fn()) {
  render(
    <SwapModal benchEntry={lapras} myPicks={myPicks} myBalance={myBalance} tierByName={tiers}
      leagueSettings={settings} swapping={false} onConfirm={onConfirm} onClose={vi.fn()} />,
  );
  return onConfirm;
}

describe('SwapModal', () => {
  it('subir de tier: muestra lo que pagas y el saldo que te queda, y confirma', async () => {
    const onConfirm = renderModal([pick('rattata')], 400);

    await userEvent.click(screen.getByRole('button', { name: /rattata/i }));

    expect(screen.getByText(/pagas la diferencia de tier/)).toBeInTheDocument();
    expect(screen.getByText('−💰 300')).toBeInTheDocument();
    expect(screen.getByText(/Te quedan 💰 100/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar intercambio' }));
    expect(onConfirm).toHaveBeenCalledWith('rattata');
  });

  it('sin saldo para la diferencia: dice cuánto falta y no deja confirmar', async () => {
    renderModal([pick('rattata')], 100);

    await userEvent.click(screen.getByRole('button', { name: /rattata/i }));

    expect(screen.getByText(/Te faltan 200 monedas/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirmar intercambio' })).toBeDisabled();
  });

  it('bajar de tier no exige tener el precio del Pokémon de la banca', async () => {
    renderModal([pick('mew')], 0);

    await userEvent.click(screen.getByRole('button', { name: /mew/i }));

    expect(screen.getByText('+💰 200')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirmar intercambio' })).toBeEnabled();
  });

  it('un Pokémon bloqueado no se puede entregar', async () => {
    const future = new Date(Date.now() + 3_600_000).toISOString();
    renderModal([pick('onix', future)], 1000);

    const onix = screen.getByRole('button', { name: /onix/i });
    expect(onix).toHaveAttribute('aria-disabled', 'true');
    await userEvent.click(onix);
    expect(screen.getByRole('button', { name: 'Confirmar intercambio' })).toBeDisabled();
  });
});
