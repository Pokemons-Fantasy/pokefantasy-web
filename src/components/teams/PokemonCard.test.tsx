import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import PokemonCard from './PokemonCard';
import type { DraftPick } from '../../api/pokemons';

const now = new Date('2026-10-14T10:00:00Z');
const lockedUntil = new Date(now.getTime() + (2 * 24 + 5) * 60 * 60_000).toISOString();
const pick = { username: 'ash', pokemonName: 'lapras', pokemonId: 131, round: 1, lockedUntil } as DraftPick;

function renderCard(isMine: boolean, locked: boolean, stealWindowOpen = false) {
  render(
    <PokemonCard pick={pick} tier="A" isMine={isMine} locked={locked} now={now} isDraftCompleted
      stealWindowOpen={stealWindowOpen} stealPrice={300} canAffordSteal onInfo={vi.fn()} />,
  );
}

describe('PokemonCard: tiempo de bloqueo', () => {
  it('en tu equipo muestra cuánto le queda al bloqueo', () => {
    renderCard(true, true);
    expect(screen.getByText('2d 5h')).toBeInTheDocument();
    expect(screen.getByText(/^Bloqueado hasta/)).toBeInTheDocument();
  });

  it('en un rival lo muestra también con los robos cerrados', () => {
    renderCard(false, true);
    expect(screen.getByText('2d 5h')).toBeInTheDocument();
    expect(screen.queryByText('⇄ proponer')).not.toBeInTheDocument();
  });

  it('en un rival bloqueado con los robos abiertos no muestra el precio de robo', () => {
    renderCard(false, true, true);
    expect(screen.getByText('2d 5h')).toBeInTheDocument();
    expect(screen.queryByText('💰 300')).not.toBeInTheDocument();
  });

  it('sin bloqueo no hay chip', () => {
    renderCard(true, false);
    expect(screen.queryByText(/Bloqueado hasta/)).not.toBeInTheDocument();
  });
});
