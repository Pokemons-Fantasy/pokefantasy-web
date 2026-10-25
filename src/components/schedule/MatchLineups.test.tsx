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

  it('sin revelar: de la del rival no se ve ningún Pokémon', () => {
    render(<MatchLineups username="ash" spriteIds={SPRITES} match={match({
      player1LineupSubmitted: true, player1Lineup: { pokemonNames: ['pikachu'] },
    })} />);

    expect(screen.getByRole('region', { name: 'Alineación de ash' })).toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: 'Alineación de misty' })).queryByRole('img')).not.toBeInTheDocument();
  });

  it('sin alineaciones que mostrar no pinta nada', () => {
    const { container } = render(<MatchLineups username="brock" spriteIds={SPRITES} match={match({})} />);

    expect(container).toBeEmptyDOMElement();
  });
});

describe('MatchLineups — enlaces', () => {
  it('solo enlaza pastes https', () => {
    render(<MatchLineups username="ash" spriteIds={SPRITES} match={match({
      player1LineupSubmitted: true, player1Lineup: { pokemonNames: ['pikachu'], pasteUrl: 'javascript:alert(1)' },
    })} />);

    expect(screen.queryByRole('link', { name: 'Ver equipo' })).not.toBeInTheDocument();
  });
});

describe('MatchLineups — dos pisos y siluetas', () => {
  it('cada alineación va en su lado: player1 a la izquierda y player2 a la derecha', () => {
    render(<MatchLineups username="brock" spriteIds={SPRITES} match={match({
      player1LineupSubmitted: true, player2LineupSubmitted: true,
      player1Lineup: { pokemonNames: ['pikachu'] }, player2Lineup: { pokemonNames: ['starmie'] },
    })} />);

    expect(screen.getByRole('region', { name: 'Alineación de ash' })).toHaveClass('left');
    expect(screen.getByRole('region', { name: 'Alineación de misty' })).toHaveClass('right');
  });

  it('antes de revelar, el rival que no ha enviado sale como siluetas "Pendiente" y yo con mis sprites', () => {
    render(<MatchLineups username="ash" spriteIds={SPRITES} match={match({
      lineupOpen: true, player1LineupSubmitted: true, player2LineupSubmitted: false,
      player1Lineup: { pokemonNames: ['pikachu'] },
    })} status="Esperando la alineación de misty" />);

    const rival = screen.getByRole('region', { name: 'Alineación de misty' });
    expect(within(rival).getByText('Pendiente')).toBeInTheDocument();
    expect(within(rival).queryByRole('img')).not.toBeInTheDocument();
    expect(rival.querySelectorAll('.lineup-silhouette')).toHaveLength(6);
    expect(within(screen.getByRole('region', { name: 'Alineación de ash' })).getByRole('img', { name: 'pikachu' }))
      .toBeInTheDocument();
    expect(screen.getByText('Esperando la alineación de misty')).toBeInTheDocument();
  });

  it('el rival ya la envió: siluetas con "Enviada ✓" y la mía pendiente', () => {
    render(<MatchLineups username="ash" spriteIds={SPRITES} match={match({
      lineupOpen: true, player2LineupSubmitted: true,
    })} />);

    expect(within(screen.getByRole('region', { name: 'Alineación de misty' })).getByText('Enviada ✓'))
      .toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: 'Alineación de ash' })).getByText('Pendiente'))
      .toBeInTheDocument();
  });

  it('solo con un texto de estado (mercado aún abierto) no pinta siluetas', () => {
    render(<MatchLineups username="ash" spriteIds={SPRITES} match={match({ lineupPending: true })}
      status="Podrás declarar tu alineación desde vie 5 jun, 16:00" />);

    expect(screen.getByText('Podrás declarar tu alineación desde vie 5 jun, 16:00')).toBeInTheDocument();
    expect(screen.queryByRole('region')).not.toBeInTheDocument();
  });
});
