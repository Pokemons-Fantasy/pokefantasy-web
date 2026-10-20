import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import PokemonCard from './PokemonCard';
import type { DraftPick } from '../../api/pokemons';

const pick = { username: 'ash', pokemonName: 'lapras', pokemonId: 131, round: 1, locked: true, lockedThroughJornada: 3 } as DraftPick;
const LOCK_TITLE = 'Bloqueado hasta que termine la jornada 3';

function renderCard(isMine: boolean, locked: boolean, stealWindowOpen = false) {
  render(
    <PokemonCard pick={pick} tier="A" isMine={isMine} locked={locked} isDraftCompleted
      stealWindowOpen={stealWindowOpen} stealPrice={300} canAffordSteal onInfo={vi.fn()} />,
  );
}

describe('PokemonCard: bloqueo hasta fin de jornada', () => {
  it('en tu equipo muestra la jornada hasta la que dura el bloqueo', () => {
    renderCard(true, true);
    expect(screen.getByTitle(LOCK_TITLE)).toHaveTextContent('🔒 J3');
  });

  it('en un rival lo muestra también con los robos cerrados', () => {
    renderCard(false, true);
    expect(screen.getByTitle(LOCK_TITLE)).toBeInTheDocument();
    expect(screen.queryByText('⇄ proponer')).not.toBeInTheDocument();
  });

  it('en un rival bloqueado con los robos abiertos no muestra el precio de robo', () => {
    renderCard(false, true, true);
    expect(screen.getByTitle(LOCK_TITLE)).toBeInTheDocument();
    expect(screen.queryByText('💰 300')).not.toBeInTheDocument();
  });

  it('en tu equipo se ve la cláusula y se puede subir con los robos cerrados', () => {
    render(
      <PokemonCard pick={pick} tier="A" isMine locked isDraftCompleted stealWindowOpen={false}
        stealPrice={300} canAffordSteal={false} onInfo={vi.fn()} onRaisePrice={vi.fn()} />,
    );
    expect(screen.getByText('🛡 300')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Subir precio de robo' })).toBeInTheDocument();
  });

  it('antes de acabar el draft no se ve la cláusula', () => {
    render(
      <PokemonCard pick={pick} tier="A" isMine locked={false} isDraftCompleted={false} stealWindowOpen={false}
        stealPrice={300} canAffordSteal={false} onInfo={vi.fn()} onRaisePrice={vi.fn()} />,
    );
    expect(screen.queryByText('🛡 300')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Subir precio de robo' })).not.toBeInTheDocument();
  });

  it('sin bloqueo no hay chip', () => {
    renderCard(true, false);
    expect(screen.queryByTitle(LOCK_TITLE)).not.toBeInTheDocument();
  });
});
