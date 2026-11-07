import type { EventStream } from './state';
import type { ServerState, Tile } from './types';

// A stand-in for EventSource that tests drive by hand.
export class FakeStream implements EventStream {
  static opened: FakeStream[] = [];
  static get last(): FakeStream {
    return FakeStream.opened[FakeStream.opened.length - 1]!;
  }

  readyState = 0;
  closed = false;
  onerror: ((event: Event) => void) | null = null;
  private listeners = new Map<string, (event: MessageEvent) => void>();

  constructor(public url: string) {
    FakeStream.opened.push(this);
  }

  addEventListener(type: string, listener: (event: MessageEvent) => void): void {
    this.listeners.set(type, listener);
  }

  close(): void {
    this.closed = true;
    this.readyState = 2;
  }

  emit(type: string, data: unknown): void {
    this.readyState = 1;
    this.listeners.get(type)?.({ data: JSON.stringify(data) } as MessageEvent);
  }

  // drop: the connection broke and the browser is retrying on its own.
  // fail: the server answered with an error and the browser gave up.
  fail(mode: 'drop' | 'fail'): void {
    this.readyState = mode === 'fail' ? 2 : 0;
    this.onerror?.(new Event('error'));
  }
}

export const openFake = (url: string) => new FakeStream(url);

export function tile(overrides: Partial<Tile>): Tile {
  return {
    id: overrides.id ?? `c/apps/ns/${overrides.name ?? 'x'}`,
    kind: 'application',
    cluster: 'c',
    name: 'x',
    group: 'g',
    url: 'https://example.com',
    targetBlank: false,
    location: 1000,
    tags: [],
    source: { type: 'apps', version: 'v1', namespace: 'ns', name: 'x' },
    editable: true,
    ...overrides,
  };
}

export function serverState(overrides: Partial<ServerState> = {}): ServerState {
  return {
    schemaVersion: 1,
    tiles: [],
    clusters: [{ name: 'local', local: true, state: 'connected' }],
    config: { title: 'Home lab' },
    editing: { available: false },
    ...overrides,
  };
}
