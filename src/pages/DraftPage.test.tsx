import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import DraftPage from './DraftPage';
import { useAuthStore } from '../store/authStore';
import * as leaguesApi from '../api/leagues';
import * as pokemonsApi from '../api/pokemons';
import type { DraftPick, DraftStatus } from '../api/pokemons';

vi.mock('../api/leagues', async (importOriginal) => ({
  ...(await importOriginal<typeof leaguesApi>()),
  getLeagueDetail: vi.fn(),
  getLeagueSettings: vi.fn(),
}));
vi.mock('../api/pokemons', async (importOriginal) => ({
  ...(await importOriginal<typeof pokemonsApi>()),
  getDraftStatus: vi.fn(),
  getClosedList: vi.fn(),
  cancelDraft: vi.fn(),
}));

class FakeEventSource {
  static CLOSED = 2;
  readyState = 1;
  addEventListener() {}
  close() {}
}

const pick = (username: string, pokemonName: string, round: number): DraftPick => ({
  username, pokemonName, pokemonId: 1, round, pickedAt: '2026-09-01T10:00:00Z',
});

const draft = (overrides: Partial<DraftStatus>): DraftStatus => ({
  id: 'd1', status: 'COMPLETED', turnOrder: ['ash', 'brock'], currentTurn: null, currentRound: 1,
  picks: [], draftHistory: [], ...overrides,
});

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/leagues/l1/draft']}>
        <Routes>
          <Route path="/leagues/:leagueId/draft" element={<DraftPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('DraftPage', () => {
  beforeEach(() => {
    vi.stubGlobal('EventSource', FakeEventSource);
    useAuthStore.setState({ username: 'ash' });
    vi.mocked(leaguesApi.getLeagueDetail).mockResolvedValue({
      id: 'l1', name: 'Liga', createdBy: 'ash', status: 'SETUP',
      members: [{ username: 'ash', leagueRole: 'ADMIN' }, { username: 'brock', leagueRole: 'USER' }],
    });
    vi.mocked(leaguesApi.getLeagueSettings).mockResolvedValue({
      coinsPerWin: 100, coinsPerLoss: 50, priceTierS: 10, priceTierA: 5, priceTierB: 3, priceTierC: 2, priceTierD: 1,
      tierPctS: 20, tierPctA: 20, tierPctB: 20, tierPctC: 20, tierPctD: 20, maxTeamSize: 2,
    });
    vi.mocked(pokemonsApi.getClosedList).mockResolvedValue([]);
  });

  it('cancelar el draft pide confirmación con lo que pasa y lo cancela', async () => {
    const user = userEvent.setup();
    vi.mocked(pokemonsApi.cancelDraft).mockResolvedValue(undefined);
    vi.mocked(pokemonsApi.getDraftStatus).mockResolvedValue(draft({ status: 'IN_PROGRESS', currentTurn: 'brock' }));
    renderPage();

    await user.click(await screen.findByRole('button', { name: 'Cancelar draft' }));
    const dialog = screen.getByRole('alertdialog', { name: '¿Cancelar el draft?' });
    expect(dialog).toHaveTextContent('Se reabren las nominaciones y el pool pierde los tiers');
    expect(screen.getByRole('button', { name: 'Seguir con el draft' })).toHaveFocus();

    await user.click(screen.getByRole('button', { name: 'Sí, cancelar el draft' }));
    await vi.waitFor(() => expect(pokemonsApi.cancelDraft).toHaveBeenCalledWith('l1'));
  });

  it('con historial muestra el tablero y los picks del draft', async () => {
    vi.mocked(pokemonsApi.getDraftStatus).mockResolvedValue(draft({
      draftHistory: [pick('ash', 'mewtwo', 1), pick('brock', 'onix', 1)],
      picks: [pick('ash', 'mewtwo', 1), pick('brock', 'onix', 1), pick('brock', 'eevee', 0)],
    }));
    renderPage();

    expect(await screen.findByRole('region', { name: 'Tablero del draft' })).toBeInTheDocument();
    expect(screen.getByText('Picks del draft')).toBeInTheDocument();
    expect(screen.getByText('Picks del draft').nextElementSibling).toHaveTextContent('2');
  });

  it('con el draft en curso cuenta los picks sobre el total previsto', async () => {
    vi.mocked(pokemonsApi.getDraftStatus).mockResolvedValue(draft({
      status: 'IN_PROGRESS', currentTurn: 'brock', currentRound: 1,
      draftHistory: [pick('ash', 'mewtwo', 1)], picks: [pick('ash', 'mewtwo', 1)],
    }));
    renderPage();

    expect(await screen.findByLabelText('Ronda 1, pick 2: turno de brock')).toBeInTheDocument();
    expect(await screen.findByText('1 de 4')).toBeInTheDocument();
  });

  it('una liga terminada sin historial avisa en lugar de mostrar un tablero vacío', async () => {
    vi.mocked(pokemonsApi.getDraftStatus).mockResolvedValue(draft({
      draftHistory: [], picks: [pick('ash', 'mewtwo', 1)],
    }));
    renderPage();

    expect(await screen.findByText(/se drafteó antes de que se guardara el historial/)).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Tablero del draft' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver equipos' })).toHaveAttribute('href', '/leagues/l1/teams');
  });

  describe('con presupuesto', () => {
    const CONFIG = { budget: 300, priceS: 200, priceA: 150, priceB: 100, priceC: 60, priceD: 30, snake: false };
    const entry = (id: string, pokemonName: string, tier: 'S' | 'D') => ({
      id, pokemonId: 1, pokemonName, nominatedBy: 'ash', sprite: '', tier,
    });

    it('en preparación los jugadores ven los tiers y los precios', async () => {
      useAuthStore.setState({ username: 'brock' });
      vi.mocked(pokemonsApi.getClosedList).mockResolvedValue([entry('e1', 'mew', 'S')]);
      vi.mocked(pokemonsApi.getDraftStatus).mockResolvedValue(draft({
        status: 'PENDING', config: CONFIG, budgets: { ash: 300, brock: 300 },
      }));
      renderPage();
      expect(await screen.findByText('El admin está preparando el draft')).toBeInTheDocument();
      expect(await screen.findByLabelText('Mew, tier S, 200 monedas')).toBeInTheDocument();
    });

    it('en tu turno ves lo que te queda y lo que no puedes pagar sale deshabilitado', async () => {
      vi.mocked(pokemonsApi.getClosedList).mockResolvedValue([entry('e1', 'mew', 'S'), entry('e2', 'abra', 'D')]);
      vi.mocked(pokemonsApi.getDraftStatus).mockResolvedValue(draft({
        status: 'IN_PROGRESS', currentTurn: 'ash', config: CONFIG, budgets: { ash: 100, brock: 300 },
      }));
      renderPage();
      expect(await screen.findByText('Te quedan')).toBeInTheDocument();
      expect(await screen.findByRole('button', { name: 'Mew, 200 monedas, no te llega' }))
        .toHaveAttribute('aria-disabled', 'true');
      expect(screen.getByRole('button', { name: 'Abra, 30 monedas' })).not.toHaveAttribute('aria-disabled', 'true');
    });

    it('el modal de confirmación dice cuánto te quedará', async () => {
      vi.mocked(pokemonsApi.getClosedList).mockResolvedValue([entry('e2', 'abra', 'D')]);
      vi.mocked(pokemonsApi.getDraftStatus).mockResolvedValue(draft({
        status: 'IN_PROGRESS', currentTurn: 'ash', config: CONFIG, budgets: { ash: 100, brock: 300 },
      }));
      renderPage();
      await userEvent.click(await screen.findByRole('button', { name: 'Abra, 30 monedas' }));
      expect(screen.getByText(/te quedarán 70 monedas/)).toBeInTheDocument();
    });

    it('con el draft completado no dice "Te quedan": el sobrante ya está en el saldo', async () => {
      vi.mocked(pokemonsApi.getDraftStatus).mockResolvedValue(draft({
        status: 'COMPLETED', config: CONFIG, budgets: { ash: 20, brock: 10 },
        draftHistory: [{ ...pick('ash', 'mew', 1), price: 280 }],
      }));
      renderPage();
      expect(await screen.findByText('Completado')).toBeInTheDocument();
      expect(screen.queryByText('Te quedan')).not.toBeInTheDocument();
    });

    it('con el pool aún cargando no da tu draft por terminado', async () => {
      vi.mocked(pokemonsApi.getClosedList).mockReturnValue(new Promise(() => {}));
      vi.mocked(pokemonsApi.getDraftStatus).mockResolvedValue(draft({
        status: 'IN_PROGRESS', currentTurn: 'brock', config: CONFIG, budgets: { ash: 300, brock: 300 },
      }));
      renderPage();
      expect(await screen.findByText(/Esperando el turno de/)).toBeInTheDocument();
      expect(screen.queryByText(/Tu draft ha terminado/)).not.toBeInTheDocument();
    });

    it('sin dinero para ningún Pokémon libre tu draft ha terminado', async () => {
      vi.mocked(pokemonsApi.getClosedList).mockResolvedValue([entry('e1', 'mew', 'S')]);
      vi.mocked(pokemonsApi.getDraftStatus).mockResolvedValue(draft({
        status: 'IN_PROGRESS', currentTurn: 'brock', config: CONFIG, budgets: { ash: 20, brock: 300 },
      }));
      renderPage();
      expect(await screen.findByText('Tu draft ha terminado: no te llega para ningún Pokémon libre')).toBeInTheDocument();
    });
  });
});
