import { signal } from '@preact/signals';
import { SCHEMA_VERSION, type ServerState } from './types';

// The one signal that holds what the server knows.
export const serverState = signal<ServerState | null>(null);
// Set when the last load failed. The previous state, if any, stays visible.
export const loadError = signal<string | null>(null);

let etag: string | null = null;
let inFlight: Promise<void> | null = null;

export function load(fetcher: typeof fetch = fetch): Promise<void> {
  inFlight ??= fetchState(fetcher).finally(() => {
    inFlight = null;
  });
  return inFlight;
}

async function fetchState(fetcher: typeof fetch): Promise<void> {
  try {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (etag && serverState.value) {
      headers['If-None-Match'] = etag;
    }
    const response = await fetcher('/api/v1/state', { headers });
    if (response.status === 304) {
      loadError.value = null;
      return;
    }
    if (!response.ok) {
      throw new Error(`The server answered ${response.status}.`);
    }
    const state = (await response.json()) as ServerState;
    if (state.schemaVersion !== SCHEMA_VERSION) {
      throw new Error('The server speaks a newer protocol. Reload the page.');
    }
    etag = response.headers.get('ETag');
    serverState.value = state;
    loadError.value = null;
  } catch (error) {
    loadError.value = error instanceof Error ? error.message : String(error);
  }
}

// For tests.
export function reset(): void {
  serverState.value = null;
  loadError.value = null;
  etag = null;
  inFlight = null;
}
