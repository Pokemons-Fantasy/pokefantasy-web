import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
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
});
