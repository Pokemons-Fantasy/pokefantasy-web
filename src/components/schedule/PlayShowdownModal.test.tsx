import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { Clipboard } from '@capacitor/clipboard';
import PlayShowdownModal from './PlayShowdownModal';
import { challengeCommand, SHOWDOWN_PLAY_URL, showdownTeamText } from '../../utils/showdown';
import type { LeagueSettings } from '../../api/leagues';

vi.mock('@capacitor/clipboard', () => ({ Clipboard: { write: vi.fn().mockResolvedValue(undefined) } }));

const MY_TEAM = ['urshifu-rapid-strike', 'pikachu'];

function renderModal(props: {
  myShowdownName?: string | null;
  rivalShowdownName?: string | null;
  settings?: Partial<LeagueSettings>;
}) {
  const onClose = vi.fn();
  render(
    <MemoryRouter>
      <PlayShowdownModal
        rival="misty"
        myShowdownName={'myShowdownName' in props ? props.myShowdownName : 'Ash Ketchum'}
        rivalShowdownName={'rivalShowdownName' in props ? props.rivalShowdownName : 'Misty Cerulean'}
        settings={props.settings ?? {}}
        myPokemonNames={MY_TEAM}
        onClose={onClose}
      />
    </MemoryRouter>
  );
  return onClose;
}

describe('PlayShowdownModal', () => {
  beforeEach(() => vi.mocked(Clipboard.write).mockClear());

  it('muestra el reto exacto y lo copia', async () => {
    renderModal({});
    const command = challengeCommand('Misty Cerulean', {});

    expect(screen.getByRole('dialog', { name: 'Jugar en Showdown' })).toHaveFocus();
    expect(screen.getByText(command)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Copiar reto' }));

    expect(Clipboard.write).toHaveBeenCalledWith({ string: command });
  });

  it('copia mi equipo en formato de Showdown y enlaza a Showdown en otra pestaña', async () => {
    renderModal({});

    await userEvent.click(screen.getByRole('button', { name: 'Copiar mi equipo' }));

    expect(Clipboard.write).toHaveBeenCalledWith({ string: showdownTeamText(MY_TEAM) });
    const link = screen.getByRole('link', { name: 'Abrir Showdown' });
    expect(link).toHaveAttribute('href', SHOWDOWN_PLAY_URL);
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('explica los pasos con el formato y los Pokémon a elegir de la liga, y avisa de subir los replays', () => {
    renderModal({});

    const steps = screen.getAllByRole('listitem').map((li) => li.textContent);
    expect(steps).toEqual([
      'En Showdown, abre el Teambuilder, crea un equipo nuevo y pega tu equipo con «Import from text».',
      'Completa movimientos, objetos, habilidades y estadísticas, y elige el formato Doubles Custom Game.',
      'Quien reta pega el reto en el chat de Showdown y elige su equipo; el rival elige el suyo al aceptar.',
      'En el Team Preview, cada uno elige sus 4 Pokémon.',
    ]);
    expect(screen.getByText(
      'Al terminar cada partida, pulsa «Upload and share replay» en Showdown: sin replay no se podrá importar el resultado.'
    )).toBeInTheDocument();
  });

  it('jugando con los 6 en individual no menciona el Team Preview', () => {
    renderModal({ settings: { battleGameType: 'SINGLES', pickedTeamSize: 6 } });

    const steps = screen.getAllByRole('listitem').map((li) => li.textContent);
    expect(steps).toHaveLength(3);
    expect(steps[1]).toContain('Custom Game.');
    expect(steps[1]).not.toContain('Doubles');
  });

  it('si el rival no ha vinculado su cuenta, avisa y no ofrece el reto', () => {
    renderModal({ rivalShowdownName: null });

    expect(screen.getByText('misty no ha vinculado su cuenta de Showdown.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Copiar reto' })).not.toBeInTheDocument();
  });

  it('si yo no he vinculado mi cuenta, enlaza al perfil', () => {
    renderModal({ myShowdownName: null });

    expect(screen.getByRole('link', { name: 'Vincula tu cuenta de Showdown en tu perfil.' }))
      .toHaveAttribute('href', '/profile');
    expect(screen.queryByRole('button', { name: 'Copiar reto' })).not.toBeInTheDocument();
  });

  it('Cerrar llama a onClose', async () => {
    const onClose = renderModal({});

    await userEvent.click(screen.getByRole('button', { name: 'Cerrar' }));

    expect(onClose).toHaveBeenCalled();
  });
});
