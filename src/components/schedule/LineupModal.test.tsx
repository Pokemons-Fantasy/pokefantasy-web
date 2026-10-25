import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import LineupModal from './LineupModal';
import * as leaguesApi from '../../api/leagues';
import type { DraftPick } from '../../api/pokemons';
import type { Lineup, TeamSheet } from '../../api/leagues';
import { useToastStore } from '../../store/toastStore';

vi.mock('../../api/leagues', async (importOriginal) => ({
  ...(await importOriginal<typeof leaguesApi>()),
  declareLineup: vi.fn(),
}));
const mockedDeclare = vi.mocked(leaguesApi.declareLineup);

const NAMES = ['pikachu', 'raichu', 'onix', 'starmie', 'garchomp', 'gengar', 'snorlax'];
const PICKS: DraftPick[] = NAMES.map((pokemonName, i) => ({
  username: 'ash', pokemonName, pokemonId: i + 1, round: 1, pickedAt: '2026-01-01T00:00:00Z',
}));

function renderModal({ picks = PICKS, current = null, teamSheet = 'CLOSED' as TeamSheet }:
  { picks?: DraftPick[]; current?: Lineup | null; teamSheet?: TeamSheet } = {}) {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  const invalidate = vi.spyOn(client, 'invalidateQueries');
  const onClose = vi.fn();
  render(
    <QueryClientProvider client={client}>
      <LineupModal leagueId="l1" matchId="m1" myPicks={picks} current={current} teamSheet={teamSheet} onClose={onClose} />
    </QueryClientProvider>
  );
  return { invalidate, onClose };
}

async function pick(user: ReturnType<typeof userEvent.setup>, names: string[]) {
  for (const name of names) await user.click(screen.getByRole('checkbox', { name }));
}

describe('LineupModal', () => {
  beforeEach(() => {
    mockedDeclare.mockReset();
    useToastStore.setState({ toasts: [] });
  });

  it('muestra mis Pokémon con su sprite y explica que es a ciegas', () => {
    renderModal();

    expect(screen.getByRole('dialog', { name: 'Declarar alineación' })).toHaveFocus();
    expect(screen.getAllByRole('checkbox')).toHaveLength(7);
    expect(screen.getByRole('img', { name: 'pikachu' })).toHaveAttribute('src', expect.stringContaining('/1.png'));
    expect(screen.getByText(
      'Tu rival no la verá hasta que los dos la hayáis enviado. Después no se puede cambiar.'
    )).toBeInTheDocument();
  });

  it('no deja enviar hasta tener 6 ni marcar más de 6', async () => {
    renderModal();
    const user = userEvent.setup();

    await pick(user, NAMES.slice(0, 5));
    expect(screen.getByRole('button', { name: 'Enviar alineación' })).toBeDisabled();
    await pick(user, ['gengar']);
    expect(screen.getByRole('button', { name: 'Enviar alineación' })).toBeEnabled();
    expect(screen.getByRole('checkbox', { name: 'snorlax' })).toBeDisabled();
  });

  it('con equipo de 4 pide los 4', async () => {
    renderModal({ picks: PICKS.slice(0, 4) });
    const user = userEvent.setup();

    await pick(user, NAMES.slice(0, 4));

    expect(screen.getByRole('button', { name: 'Enviar alineación' })).toBeEnabled();
  });

  it('envía en el orden elegido, refresca el calendario y avisa', async () => {
    mockedDeclare.mockResolvedValue(undefined);
    const { invalidate, onClose } = renderModal();
    const user = userEvent.setup();
    const order = ['gengar', 'pikachu', 'onix', 'starmie', 'raichu', 'garchomp'];

    await pick(user, order);
    await user.click(screen.getByRole('button', { name: 'Enviar alineación' }));

    await waitFor(() => expect(mockedDeclare).toHaveBeenCalledWith('l1', 'm1', order, undefined));
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['schedule', 'l1'] });
    expect(useToastStore.getState().toasts.at(-1)).toMatchObject({ type: 'success', message: 'Alineación enviada' });
    expect(onClose).toHaveBeenCalled();
  });

  it('con lista abierta pide un enlace https', async () => {
    mockedDeclare.mockResolvedValue(undefined);
    renderModal({ teamSheet: 'OPEN' });
    const user = userEvent.setup();

    await pick(user, NAMES.slice(0, 6));
    const link = screen.getByLabelText('Enlace a tu equipo');
    await user.type(link, 'http://pokepast.es/abc');
    expect(screen.getByRole('button', { name: 'Enviar alineación' })).toBeDisabled();

    await user.clear(link);
    await user.type(link, 'https://pokepast.es/abc');
    await user.click(screen.getByRole('button', { name: 'Enviar alineación' }));

    await waitFor(() => expect(mockedDeclare).toHaveBeenCalledWith('l1', 'm1', NAMES.slice(0, 6),
      'https://pokepast.es/abc'));
  });

  it('precarga la alineación ya enviada', () => {
    renderModal({ current: { pokemonNames: NAMES.slice(0, 6), pasteUrl: null } });

    expect(screen.getByRole('checkbox', { name: 'pikachu' })).toBeChecked();
    expect(screen.getByRole('button', { name: 'Enviar alineación' })).toBeEnabled();
  });

  it('si falla, muestra el mensaje del backend', async () => {
    mockedDeclare.mockRejectedValue({ response: { data: { message: 'Las alineaciones ya están reveladas.' } } });
    renderModal();
    const user = userEvent.setup();

    await pick(user, NAMES.slice(0, 6));
    await user.click(screen.getByRole('button', { name: 'Enviar alineación' }));

    await waitFor(() => expect(useToastStore.getState().toasts.at(-1)).toMatchObject({
      type: 'error', message: 'Las alineaciones ya están reveladas.',
    }));
  });
});
