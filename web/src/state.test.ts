import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { connect, connection, fatalError, GRACE_MS, reset, serverState as state } from './state';
import { FakeStream, openFake, serverState, tile } from './testing';

let stop: () => void;

beforeEach(() => {
  reset();
  FakeStream.opened = [];
  vi.useFakeTimers();
  stop = connect(openFake);
});
afterEach(() => {
  stop();
  vi.useRealTimers();
});

const names = () => state.value?.tiles.map((t) => t.name).sort();

describe('connect', () => {
  it('opens the event stream and goes live on the snapshot', () => {
    expect(FakeStream.last.url).toBe('/api/v1/events');
    expect(connection.value).toBe('connecting');
    FakeStream.last.emit('snapshot', serverState({ tiles: [tile({ name: 'a' })] }));
    expect(connection.value).toBe('live');
    expect(names()).toEqual(['a']);
  });

  it('applies single changes to the snapshot', () => {
    const stream = FakeStream.last;
    stream.emit('snapshot', serverState({ tiles: [tile({ name: 'a' }), tile({ name: 'b' })] }));

    stream.emit('tile.upsert', tile({ name: 'c' }));
    expect(names()).toEqual(['a', 'b', 'c']);

    stream.emit('tile.upsert', tile({ id: 'c/apps/ns/a', name: 'renamed' }));
    expect(names()).toEqual(['b', 'c', 'renamed']);

    stream.emit('tile.delete', { id: 'c/apps/ns/b' });
    expect(names()).toEqual(['c', 'renamed']);

    stream.emit('cluster.status', { name: 'local', local: true, state: 'stale' });
    stream.emit('cluster.status', { name: 'remote', local: false, state: 'connected' });
    expect(state.value?.clusters).toEqual([
      { name: 'local', local: true, state: 'stale' },
      { name: 'remote', local: false, state: 'connected' },
    ]);
  });

  it('drops a cluster that is no longer part of the state', () => {
    const stream = FakeStream.last;
    stream.emit('snapshot', serverState());
    stream.emit('cluster.status', { name: 'prod', local: false, state: 'connected' });
    expect(state.value?.clusters.map((c) => c.name)).toEqual(['local', 'prod']);
    stream.emit('cluster.delete', { name: 'prod' });
    expect(state.value?.clusters.map((c) => c.name)).toEqual(['local']);
  });

  it('takes changed settings of the page from the stream', () => {
    const stream = FakeStream.last;
    stream.emit('snapshot', serverState({ tiles: [tile({ name: 'a' })] }));
    stream.emit('config', { ...serverState().config, title: 'Renamed' });
    expect(state.value?.config.title).toBe('Renamed');
    expect(names()).toEqual(['a']);
  });

  it('replaces the signal value so that views update', () => {
    const stream = FakeStream.last;
    stream.emit('snapshot', serverState());
    const before = state.value;
    stream.emit('tile.upsert', tile({ name: 'a' }));
    expect(state.value).not.toBe(before);
  });

  it('ignores changes that arrive before a snapshot', () => {
    FakeStream.last.emit('tile.upsert', tile({ name: 'a' }));
    expect(state.value).toBeNull();
  });

  it('keeps the state while the browser reconnects, then takes the new snapshot', () => {
    const stream = FakeStream.last;
    stream.emit('snapshot', serverState({ tiles: [tile({ name: 'a' })] }));
    stream.fail('drop');
    vi.advanceTimersByTime(GRACE_MS);
    expect(connection.value).toBe('reconnecting');
    expect(names()).toEqual(['a']);
    expect(FakeStream.opened).toHaveLength(1);

    stream.emit('snapshot', serverState({ tiles: [tile({ name: 'b' })] }));
    expect(connection.value).toBe('live');
    expect(names()).toEqual(['b']);
  });

  it('does not announce a drop that is over within the grace period', () => {
    const stream = FakeStream.last;
    stream.emit('snapshot', serverState());
    stream.fail('drop');
    stream.fail('drop'); // a second failed attempt must not restart the clock
    vi.advanceTimersByTime(GRACE_MS - 1);
    expect(connection.value).toBe('live');
    stream.emit('snapshot', serverState());
    vi.advanceTimersByTime(GRACE_MS);
    expect(connection.value).toBe('live');
  });

  it('opens a new stream with backoff when the browser gives up', () => {
    FakeStream.last.emit('snapshot', serverState());
    FakeStream.last.fail('fail');
    expect(FakeStream.opened).toHaveLength(1);
    vi.advanceTimersByTime(1000);
    expect(FakeStream.opened).toHaveLength(2);

    FakeStream.last.fail('fail');
    vi.advanceTimersByTime(1000);
    expect(FakeStream.opened).toHaveLength(2);
    vi.advanceTimersByTime(1000);
    expect(FakeStream.opened).toHaveLength(3);

    // A snapshot resets the backoff.
    FakeStream.last.emit('snapshot', serverState());
    FakeStream.last.fail('fail');
    vi.advanceTimersByTime(1000);
    expect(FakeStream.opened).toHaveLength(4);
  });

  it('stays in connecting when the first attempt fails', () => {
    FakeStream.last.fail('fail');
    expect(connection.value).toBe('connecting');
  });

  it('stops for good on a schema version it does not know', () => {
    FakeStream.last.emit('snapshot', { ...serverState(), schemaVersion: 2 });
    expect(state.value).toBeNull();
    expect(fatalError.value).toMatch(/newer protocol/);
    expect(FakeStream.last.closed).toBe(true);
  });

  it('closes the stream and cancels retries when stopped', () => {
    FakeStream.last.fail('fail');
    stop();
    vi.advanceTimersByTime(60000);
    expect(FakeStream.opened).toHaveLength(1);
    expect(FakeStream.last.closed).toBe(true);
  });
});
