import { signal } from '@preact/signals';
import { SCHEMA_VERSION, type Cluster, type ServerState, type Tile } from './types';

// The one signal that holds what the server knows. It is fed by the event
// stream: a snapshot when the stream opens, then single changes.
export const serverState = signal<ServerState | null>(null);

// connecting: no snapshot received yet.
// live: the state follows the server.
// reconnecting: the stream was lost; the last known state stays visible.
export type Connection = 'connecting' | 'live' | 'reconnecting';
export const connection = signal<Connection>('connecting');

// Set when the page cannot go on without a reload.
export const fatalError = signal<string | null>(null);

// The part of EventSource this module uses, so tests can supply their own.
export interface EventStream {
  readyState: number;
  onerror: ((event: Event) => void) | null;
  addEventListener(type: string, listener: (event: MessageEvent) => void): void;
  close(): void;
}

const CLOSED = 2;
const MIN_RETRY_MS = 1000;
const MAX_RETRY_MS = 15000;
// How long the stream may be down before the page says so. Streams drop for
// ordinary reasons, such as a restart of the server, a proxy reload, or a
// laptop waking up, and are back within a couple of seconds. Announcing
// each of those would be noise.
export const GRACE_MS = 5000;

type Opener = (url: string) => EventStream;

// Opens the event stream and keeps it open. Returns a function that stops.
//
// The browser reconnects a stream that drops. It gives up for good when the
// server answers with an error, which is what a restarting instance or a
// proxy without a backend does, so that case is retried here.
export function connect(open: Opener = (url) => new EventSource(url)): () => void {
  let stream: EventStream | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let grace: ReturnType<typeof setTimeout> | undefined;
  let retry = MIN_RETRY_MS;
  let stopped = false;

  const start = () => {
    const current = open('/api/v1/events');
    stream = current;

    current.addEventListener('snapshot', (event) => {
      const state = JSON.parse(event.data) as ServerState;
      if (state.schemaVersion !== SCHEMA_VERSION) {
        fatalError.value = 'The server speaks a newer protocol. Reload the page.';
        stop();
        return;
      }
      retry = MIN_RETRY_MS;
      clearTimeout(grace);
      grace = undefined;
      serverState.value = state;
      connection.value = 'live';
    });
    current.addEventListener('tile.upsert', (event) => {
      const tile = JSON.parse(event.data) as Tile;
      update((state) => ({
        ...state,
        tiles: [...state.tiles.filter((other) => other.id !== tile.id), tile],
      }));
    });
    current.addEventListener('tile.delete', (event) => {
      const { id } = JSON.parse(event.data) as { id: string };
      update((state) => ({ ...state, tiles: state.tiles.filter((tile) => tile.id !== id) }));
    });
    current.addEventListener('cluster.status', (event) => {
      const cluster = JSON.parse(event.data) as Cluster;
      update((state) => ({
        ...state,
        clusters: [...state.clusters.filter((other) => other.name !== cluster.name), cluster],
      }));
    });
    current.onerror = () => {
      if (stopped) return;
      if (serverState.value && connection.value === 'live') {
        grace ??= setTimeout(() => {
          connection.value = 'reconnecting';
        }, GRACE_MS);
      }
      if (current.readyState === CLOSED) {
        current.close();
        timer = setTimeout(start, retry);
        retry = Math.min(retry * 2, MAX_RETRY_MS);
      }
    };
  };

  const stop = () => {
    stopped = true;
    clearTimeout(timer);
    clearTimeout(grace);
    stream?.close();
  };

  start();
  return stop;
}

function update(change: (state: ServerState) => ServerState): void {
  // Changes can only follow a snapshot. Anything earlier is ignored.
  if (serverState.value) {
    serverState.value = change(serverState.value);
  }
}

// For tests.
export function reset(): void {
  serverState.value = null;
  connection.value = 'connecting';
  fatalError.value = null;
}
