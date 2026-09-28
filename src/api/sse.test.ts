import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { openEventStream, SSE_RETRY_MIN_MS, SSE_RETRY_MAX_MS } from './sse';

// Base fija: la real sale de VITE_API_URL y un .env.local (backend local) cambiaría la URL esperada.
vi.mock('./client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./client')>()),
  API_BASE_URL: '/api',
}));

class FakeEventSource {
  static instances: FakeEventSource[] = [];
  onopen: (() => void) | null = null;
  onerror: (() => void) | null = null;
  listeners: Record<string, (e: MessageEvent) => void> = {};
  closed = false;
  url: string;
  init?: EventSourceInit;
  constructor(url: string, init?: EventSourceInit) {
    this.url = url;
    this.init = init;
    FakeEventSource.instances.push(this);
  }
  addEventListener(type: string, listener: (e: MessageEvent) => void) { this.listeners[type] = listener; }
  close() { this.closed = true; }
}
const last = () => FakeEventSource.instances[FakeEventSource.instances.length - 1];

describe('openEventStream', () => {
  beforeEach(() => {
    FakeEventSource.instances = [];
    vi.stubGlobal('EventSource', FakeEventSource);
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('connects with credentials to the API base and dispatches events', () => {
    const onEvent = vi.fn();
    openEventStream('/v1/users/events', { listeners: { steal: onEvent } });
    expect(last().url).toBe('/api/v1/users/events');
    expect(last().init).toEqual({ withCredentials: true });
    const event = new MessageEvent('steal', { data: '{}' });
    last().listeners.steal(event);
    expect(onEvent).toHaveBeenCalledWith(event);
  });

  it('when the connection drops (the Netlify proxy cuts it) it reconnects with a growing wait', () => {
    const onDown = vi.fn();
    openEventStream('/x', { listeners: {}, onDown });
    const first = last();
    first.onerror!();
    expect(first.closed).toBe(true);
    expect(onDown).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(SSE_RETRY_MIN_MS - 1);
    expect(FakeEventSource.instances).toHaveLength(1);
    vi.advanceTimersByTime(1);
    expect(FakeEventSource.instances).toHaveLength(2);
    last().onerror!();
    vi.advanceTimersByTime(SSE_RETRY_MIN_MS * 2 - 1);
    expect(FakeEventSource.instances).toHaveLength(2);
    vi.advanceTimersByTime(1);
    expect(FakeEventSource.instances).toHaveLength(3);
  });

  it('never waits more than the maximum while the backend is down', () => {
    openEventStream('/x', { listeners: {} });
    for (let i = 0; i < 10; i++) {
      last().onerror!();
      vi.advanceTimersByTime(SSE_RETRY_MAX_MS);
    }
    expect(FakeEventSource.instances).toHaveLength(11);
  });

  it('tells whether an open is a reconnection and resets the wait', () => {
    const onOpen = vi.fn();
    openEventStream('/x', { listeners: {}, onOpen });
    last().onopen!();
    expect(onOpen).toHaveBeenLastCalledWith(false);
    last().onerror!();
    vi.advanceTimersByTime(SSE_RETRY_MIN_MS);
    last().onopen!();
    expect(onOpen).toHaveBeenLastCalledWith(true);
    last().onerror!();
    vi.advanceTimersByTime(SSE_RETRY_MIN_MS);
    expect(FakeEventSource.instances).toHaveLength(3);
  });

  it('after close() it does not reconnect', () => {
    const close = openEventStream('/x', { listeners: {} });
    const es = last();
    close();
    expect(es.closed).toBe(true);
    es.onerror!();
    vi.advanceTimersByTime(SSE_RETRY_MAX_MS);
    expect(FakeEventSource.instances).toHaveLength(1);
  });
});
