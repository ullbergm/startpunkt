import { act, cleanup, render, screen } from '@testing-library/preact';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clusterFreshness, FRESHNESS_INTERVAL_MS, freshnessText, staleDuration, timestamp, useFreshnessNow } from './freshness';
import { setLanguage } from './i18n';
import type { Cluster } from './types';

const now = Date.parse('2026-11-14T14:20:00Z');
const stale: Cluster = { name: 'prod', local: false, state: 'stale', lastSeen: '2026-11-14T14:14:45Z', staleSince: '2026-11-14T14:15:00Z' };
beforeEach(() => setLanguage('en-US'));
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('cluster freshness', () => {
  it('shows an absolute localized contact time and elapsed disconnection', () => {
    const fresh = clusterFreshness(stale, now);
    expect(fresh.lastSeen?.dateTime).toBe('2026-11-14T14:14:45.000Z');
    expect(fresh.lastSeen?.label).toBe(new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(Date.parse(stale.lastSeen!)));
    expect(fresh.duration).toBe('5 minutes');
    expect(fresh.neverReached).toBe(false);
    expect(freshnessText(stale, now)).toContain('Data stale for 5 minutes');
  });

  it('ignores malformed timestamps and identifies a remote never reached', () => {
    for (const value of [undefined, null, '', 'not a date', '2026-11-14', '42', '2026-99-99T25:99:99Z']) expect(timestamp(value)).toBeNull();
    expect(clusterFreshness({ ...stale, lastSeen: 'broken', staleSince: 'broken' }, now)).toEqual({ lastSeen: null, duration: null, neverReached: true });
    expect(freshnessText({ name: 'new', local: false, state: 'syncing' }, now)).toBe('Never reached');
    expect(freshnessText({ name: 'own', local: true, state: 'syncing' }, now)).toBe('');
  });

  it('clamps future remote clocks and clears stale duration while connected', () => {
    const future = clusterFreshness({ ...stale, lastSeen: '2026-11-15T14:20:00Z', staleSince: '2026-11-15T14:20:00Z' }, now);
    expect(future.lastSeen?.dateTime).toBe(new Date(now).toISOString());
    expect(future.duration).toBe('less than a minute');
    expect(clusterFreshness({ ...stale, state: 'connected' }, now).duration).toBeNull();
  });

  it('uses the selected language and sensible duration units', async () => {
    expect(staleDuration(now - 10_000, now)).toBe('less than a minute');
    expect(staleDuration(now - 3_600_000, now)).toBe('1 hour');
    expect(staleDuration(now - 2 * 86_400_000, now)).toBe('2 days');
    await setLanguage('sv-SE');
    expect(freshnessText(stale, now)).toContain('Data har varit inaktuella i 5 minuter');
  });
});

it('runs a refresh timer only while stale and stops it after reconnecting', () => {
  let current = now;
  const clock = () => current;
  const interval = vi.spyOn(window, 'setInterval');
  const cleared = vi.spyOn(window, 'clearInterval');
  function Clock({ active }: { active: boolean; event?: number }) { return <output>{useFreshnessNow(active, clock)}</output>; }
  const view = render(<Clock active={false} />);
  expect(interval).not.toHaveBeenCalled();
  view.rerender(<Clock active />);
  expect(interval).toHaveBeenCalledOnce();
  expect(interval.mock.calls[0]![1]).toBe(FRESHNESS_INTERVAL_MS);
  current += 60_000;
  act(() => (interval.mock.calls[0]![0] as () => void)());
  expect(screen.getByRole('status').textContent).toBe(String(current));
  view.rerender(<Clock active={false} />);
  expect(cleared).toHaveBeenCalledOnce();
  current += 60_000;
  view.rerender(<Clock active={false} event={1} />);
  expect(screen.getByRole('status').textContent).toBe(String(current));
});
