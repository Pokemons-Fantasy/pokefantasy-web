import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useNotificationSse } from './useNotificationSse';
import * as sse from '../api/sse';
import * as tradesApi from '../api/trades';
import * as leaguesApi from '../api/leagues';
import { useAuthStore } from '../store/authStore';
import { useToastStore } from '../store/toastStore';
import type { Trade } from '../api/trades';

vi.mock('../api/sse', () => ({ openEventStream: vi.fn(() => () => {}) }));
vi.mock('../api/trades', async (importOriginal) => ({
  ...(await importOriginal<typeof tradesApi>()),
  getMyPendingTrades: vi.fn(),
}));
vi.mock('../api/leagues', async (importOriginal) => ({
  ...(await importOriginal<typeof leaguesApi>()),
  getMyLeagues: vi.fn(),
}));

const trade = (id: string): Trade => ({
  id, leagueId: 'l1', proposer: 'brock', responder: 'ash',
  proposerPokemonName: 'onix', proposerPokemonId: 95, responderPokemonName: 'pikachu', responderPokemonId: 25,
  coinsOffered: 0, status: 'PENDING', createdAt: '2026-09-28T10:00:00Z',
});

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    {children}
  </QueryClientProvider>
);

describe('useNotificationSse', () => {
  beforeEach(() => {
    useAuthStore.setState({ username: 'ash' });
    useToastStore.setState({ toasts: [] });
    vi.mocked(leaguesApi.getMyLeagues).mockResolvedValue([]);
  });

  it('on reconnection shows trades proposed while the stream was down, but not the ones already known', async () => {
    // La carga inicial ve t1; después (conexión caída) llega t2
    vi.mocked(tradesApi.getMyPendingTrades).mockResolvedValueOnce([trade('t1')]);
    vi.mocked(tradesApi.getMyPendingTrades).mockResolvedValue([trade('t1'), trade('t2')]);
    renderHook(() => useNotificationSse(), { wrapper });
    const handlers = vi.mocked(sse.openEventStream).mock.calls[0][1];

    // Se reintenta la reconexión hasta que la carga inicial ha terminado (antes, la comprobación no hace
    // nada); llamarla varias veces no duplica toasts porque los ids vistos se recuerdan
    await waitFor(() => {
      handlers.onOpen!(true);
      expect(useToastStore.getState().toasts.map((t) => t.message)).toEqual(['Nueva propuesta de intercambio de brock']);
    });
  });
});
