import { act, cleanup, render, screen, within } from '@testing-library/preact';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { setLanguage } from '../i18n';
import { reloadPrefs } from '../prefs';
import { reset } from '../state';
import { FakeStream, openFake, serverState, tile } from '../testing';
import { App } from './App';
import { ClusterChips } from './ClusterChips';
import { ClusterFreshness } from './ClusterFreshness';

const now = Date.parse('2026-11-14T14:20:00Z');
const cluster = { name: 'prod', local: false, state: 'stale' as const, lastSeen: '2026-11-14T14:14:45Z', staleSince: '2026-11-14T14:15:00Z' };
beforeEach(async () => {
  reset();localStorage.clear();reloadPrefs();FakeStream.opened=[];
  await setLanguage('en-US');
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ version: 'test' }), { status: 200 })));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

it('uses semantic time while duration updates are outside polite live announcements', () => {
  const view = render(<ClusterFreshness cluster={cluster} now={now} />);
  const time = document.querySelector('time')!;
  expect(time.dateTime).toBe('2026-11-14T14:14:45.000Z');
  expect(screen.getByText(/Data stale for 5 minutes/).closest('[aria-live]')?.getAttribute('aria-live')).toBe('off');
  view.rerender(<ClusterFreshness cluster={cluster} now={now + 60_000} />);
  expect(screen.getByText(/Data stale for 6 minutes/)).toBeTruthy();
});

it('includes last contact and disconnection duration in the cluster chip tooltip and name', () => {
  render(<ClusterChips clusters={[{ name: 'local', local: true, state: 'connected' }, cluster]} shown={['local', 'prod']} now={now} />);
  const button = screen.getByRole('button', { name: /prod.*Last seen.*Data stale for 5 minutes/ });
  expect(button.getAttribute('title')).toContain('Last seen');
  expect(button.getAttribute('title')).toContain('Data stale for 5 minutes');
});

it('adds freshness below the stale App notice, clears it on reconnect and names a never-reached remote', () => {
  render(<App open={openFake} now={() => now} />);
  act(() => FakeStream.last.emit('snapshot', serverState({
    clusters: [{ name: 'local', local: true, state: 'connected' }, cluster],
    tiles: [tile({ cluster: 'prod' })],
  })));
  const summary = screen.getByText(/Not connected to prod/);
  expect(summary.closest('[role="status"]')).not.toBeNull();
  const details = screen.getByText(/prod:.*Last seen/);
  expect(details.closest('[role="status"]')).toBeNull();
  expect(details.textContent).toContain('Data stale for 5 minutes');
  act(() => FakeStream.last.emit('cluster.status', { ...cluster, state: 'connected', staleSince: undefined }));
  expect(screen.queryByText(/Not connected to prod/)).toBeNull();
  expect(document.querySelector('.cluster-freshness')).toBeNull();
  act(() => FakeStream.last.emit('cluster.status', { name: 'prod', local: false, state: 'syncing' }));
  expect(screen.getByText(/Never reached/, { selector: '.cluster-freshness' })).toBeTruthy();
  const chips = screen.getByRole('group', { name: 'Clusters to show' });
  expect(within(chips).getByRole('button', { name: /prod.*Never reached/ })).toBeTruthy();
});

it('uses the current clock for contact updates while connected without starting a timer', () => {
  let current = now;
  const clock = () => current;
  render(<App open={openFake} now={clock} />);
  act(() => FakeStream.last.emit('snapshot', serverState({
    clusters: [{ name: 'local', local: true, state: 'connected' }, { ...cluster, state: 'connected', staleSince: undefined }],
    tiles: [tile({ cluster: 'prod' })],
  })));
  current += 3_600_000;
  const seen = new Date(current - 60_000).toISOString();
  act(() => FakeStream.last.emit('cluster.status', { ...cluster, state: 'connected', staleSince: undefined, lastSeen: seen }));
  const expected = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(Date.parse(seen));
  expect(screen.getByRole('button', { name: /prod.*Last seen/ }).getAttribute('title')).toContain(expected);
});
