import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import MatchLineups from './MatchLineups';
import type { MatchDto } from '../../api/leagues';

const SPRITES = new Map([['pikachu', 25], ['starmie', 121]]);

function match(extra: Partial<MatchDto>): MatchDto {
  return { id: 'm1', player1: 'ash', player2: 'misty', status: 'PENDING', ...extra };
}

describe('MatchLineups', () => {
  it('reveladas: las dos con sprites, enlace al equipo y avisos del paste', () => {
    render(<MatchLineups username="brock" spriteIds={SPRITES} match={match({
      player1LineupSubmitted: true, player2LineupSubmitted: true,
      player1Lineup: { pokemonNames: ['pikachu'], pasteUrl: 'https://pokepast.es/abc', pasteWarnings: ['En el paste falta pikachu.'] },
      player2Lineup: { pokemonNames: ['starmie'] },
    })} />);

    const ash = screen.getByRole('region', { name: 'Alineación de ash' });
    expect(within(ash).getByRole('img', { name: 'pikachu' })).toHaveAttribute('src', expect.stringContaining('/25.png'));
    const link = within(ash).getByRole('link', { name: 'Ver equipo' });
    expect(link).toHaveAttribute('href', 'https://pokepast.es/abc');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    expect(within(ash).getByText('En el paste falta pikachu.')).toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: 'Alineación de misty' })).getByRole('img', { name: 'starmie' }))
      .toBeInTheDocument();
  });

  it('sin revelar: solo la mía', () => {
    render(<MatchLineups username="ash" spriteIds={SPRITES} match={match({
      player1LineupSubmitted: true, player1Lineup: { pokemonNames: ['pikachu'] },
    })} />);

    expect(screen.getByRole('region', { name: 'Alineación de ash' })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Alineación de misty' })).not.toBeInTheDocument();
  });

  it('sin alineaciones que mostrar no pinta nada', () => {
    const { container } = render(<MatchLineups username="brock" spriteIds={SPRITES} match={match({})} />);

    expect(container).toBeEmptyDOMElement();
  });
});
