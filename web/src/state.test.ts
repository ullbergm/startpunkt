import { beforeEach, describe, expect, it, vi } from 'vitest';
import { load, loadError, reset, serverState } from './state';

const body = {
  schemaVersion: 1,
  tiles: [],
  clusters: [],
  config: { title: 't' },
  editing: { available: false },
};

beforeEach(() => reset());

describe('load', () => {
  it('sends the ETag back and keeps the state on 304', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify(body), { status: 200, headers: { ETag: '"abc"' } }),
      )
      .mockResolvedValueOnce(new Response(null, { status: 304 }));
    await load(fetcher);
    const first = serverState.value;
    await load(fetcher);
    expect(fetcher.mock.calls[1]?.[1]?.headers['If-None-Match']).toBe('"abc"');
    expect(serverState.value).toBe(first);
    expect(loadError.value).toBeNull();
  });

  it('keeps the previous state when a later load fails', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify(body), { status: 200 }))
      .mockRejectedValueOnce(new Error('offline'));
    await load(fetcher);
    await load(fetcher);
    expect(serverState.value).not.toBeNull();
    expect(loadError.value).toBe('offline');
  });

  it('rejects a schema version it does not know', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ ...body, schemaVersion: 2 }), { status: 200 }));
    await load(fetcher);
    expect(serverState.value).toBeNull();
    expect(loadError.value).toMatch(/newer protocol/);
  });

  it('shares one request between concurrent callers', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status: 200 }));
    await Promise.all([load(fetcher), load(fetcher)]);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});
