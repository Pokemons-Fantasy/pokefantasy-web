import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ImportSeriesModal from './ImportSeriesModal';
import * as leaguesApi from '../../api/leagues';
import type { MatchDto, ReplayCandidate } from '../../api/leagues';
import { useToastStore } from '../../store/toastStore';

vi.mock('../../api/leagues', async (importOriginal) => ({
  ...(await importOriginal<typeof leaguesApi>()),
  getReplayCandidates: vi.fn(),
  importSeries: vi.fn(),
}));
const api = vi.mocked(leaguesApi);

const MATCH: MatchDto = { id: 'm1', player1: 'ash', player2: 'misty', status: 'PENDING' };

function cand(id: string, winnerUsername: string, gameNumber: number | null, extra: Partial<ReplayCandidate> = {}):
  ReplayCandidate {
  return { id, url: `https://replay.pokemonshowdown.com/${id}`, uploadtime: 1_800_000_000, winnerUsername,
    seriesId: gameNumber ? 's1' : null, gameNumber, selectable: true, warnings: [], ...extra };
}

function renderModal(bestOf = 3) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const invalidate = vi.spyOn(client, 'invalidateQueries');
  const onClose = vi.fn();
  render(
    <QueryClientProvider client={client}>
      <ImportSeriesModal leagueId="l1" match={MATCH} bestOf={bestOf} onClose={onClose} />
    </QueryClientProvider>
  );
  return { invalidate, onClose };
}

describe('ImportSeriesModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useToastStore.setState({ toasts: [] });
    api.getReplayCandidates.mockResolvedValue([
      cand('g1', 'ash', 1), cand('g2', 'misty', 2), cand('g3', 'ash', 3, { warnings: ['ash llevó Raichu, que no está en su alineación.'] }),
      cand('old', 'misty', null, { selectable: false, reason: 'Ya usado en otro partido' }),
    ]);
    api.importSeries.mockResolvedValue(undefined);
  });

  it('agrupa la serie, marca la serie entera y muestra el resumen', async () => {
    renderModal();
    const user = userEvent.setup();

    const serie = await screen.findByRole('group', { name: 'Serie' });
    expect(within(serie).getAllByRole('checkbox')).toHaveLength(3);
    expect(screen.getByRole('button', { name: 'Registrar resultado' })).toBeDisabled();

    await user.click(within(serie).getByRole('button', { name: 'Marcar la serie' }));

    expect(screen.getByText('Resultado: ash gana 2-1')).toBeInTheDocument();
    expect(screen.getByText('ash llevó Raichu, que no está en su alineación.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Registrar resultado' })).toBeEnabled();
  });

  it('las partidas que no valen salen deshabilitadas con el motivo', async () => {
    renderModal();

    const old = await screen.findByRole('checkbox', { name: /misty gana/ , description: 'Ya usado en otro partido' });
    expect(old).toBeDisabled();
  });

  it('una selección que no forma serie lo explica y no deja registrar', async () => {
    renderModal();
    const user = userEvent.setup();

    await user.click(await screen.findByRole('checkbox', { name: 'Partida 1: ash gana' }));
    await user.click(screen.getByRole('checkbox', { name: 'Partida 2: misty gana' }));

    expect(screen.getByText('Para una serie al mejor de 3 marca 2 partidas del mismo ganador o 3 con un 2-1.'))
      .toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Registrar resultado' })).toBeDisabled();
  });

  it('registra, refresca calendario, monedas y clasificación, y avisa', async () => {
    const { invalidate, onClose } = renderModal();
    const user = userEvent.setup();

    await user.click(within(await screen.findByRole('group', { name: 'Serie' }))
      .getByRole('button', { name: 'Marcar la serie' }));
    await user.click(screen.getByRole('button', { name: 'Registrar resultado' }));

    await waitFor(() => expect(api.importSeries).toHaveBeenCalledWith('l1', 'm1', ['g1', 'g2', 'g3']));
    for (const key of ['schedule', 'my-coins', 'standings', 'season-stats', 'activity']) {
      expect(invalidate).toHaveBeenCalledWith({ queryKey: [key, 'l1'] });
    }
    expect(useToastStore.getState().toasts.at(-1)).toMatchObject({ type: 'success', message: 'Resultado registrado' });
    expect(onClose).toHaveBeenCalled();
  });

  it('un enlace pegado añade su replay a la lista', async () => {
    api.getReplayCandidates.mockResolvedValueOnce([]);
    renderModal(1);
    const user = userEvent.setup();
    await screen.findByLabelText('¿No aparece? Pega el enlace del replay');
    api.getReplayCandidates.mockResolvedValueOnce([cand('priv-1-abcpw', 'misty', null)]);

    await user.type(screen.getByLabelText('¿No aparece? Pega el enlace del replay'),
      'https://replay.pokemonshowdown.com/priv-1-abcpw');
    await user.click(screen.getByRole('button', { name: 'Añadir' }));

    expect(api.getReplayCandidates).toHaveBeenLastCalledWith('l1', 'm1', 'https://replay.pokemonshowdown.com/priv-1-abcpw');
    await user.click(await screen.findByRole('checkbox', { name: 'misty gana' }));
    expect(screen.getByText('Resultado: misty gana')).toBeInTheDocument();
  });

  it('sin replays explica qué hacer', async () => {
    api.getReplayCandidates.mockResolvedValue([]);
    renderModal();

    expect(await screen.findByText(
      'No hay replays de esta semana entre los dos. ¿Los subisteis con «Upload and share replay»? Si son privados, pega el enlace.'
    )).toBeInTheDocument();
  });

  it('si el backend falla al registrar, muestra su mensaje', async () => {
    api.importSeries.mockRejectedValue({ response: { data: { message: 'El resultado de este partido ya se ha registrado.' } } });
    renderModal();
    const user = userEvent.setup();

    await user.click(within(await screen.findByRole('group', { name: 'Serie' }))
      .getByRole('button', { name: 'Marcar la serie' }));
    await user.click(screen.getByRole('button', { name: 'Registrar resultado' }));

    await waitFor(() => expect(useToastStore.getState().toasts.at(-1)).toMatchObject({
      type: 'error', message: 'El resultado de este partido ya se ha registrado.',
    }));
  });
});
