import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/preact';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { reset } from '../state';
import { FakeStream, openFake, serverState, tile } from '../testing';
import type { ServerState } from '../types';
import { App } from './App';

// Renders the page and delivers a snapshot, as the server does on connect.
function renderWith(state: ServerState) {
  const view = render(<App open={openFake} />);
  act(() => FakeStream.last.emit('snapshot', state));
  return view;
}

beforeEach(() => {
  reset();
  FakeStream.opened = [];
});
afterEach(() => cleanup());

describe('App', () => {
  it('renders applications and bookmarks in their groups', async () => {
    renderWith(
      serverState({
        tiles: [
          tile({
            name: 'Grafana',
            group: 'observability',
            info: 'Dashboards',
            url: 'https://grafana.example.com',
            targetBlank: true,
          }),
          tile({ name: 'Plex', group: 'media', url: 'https://plex.example.com' }),
          tile({ name: 'Docs', group: 'reference', kind: 'bookmark', url: 'https://kubernetes.io' }),
        ],
      }),
    );

    const applications = await screen.findByRole('region', { name: 'Applications' });
    expect(
      within(applications)
        .getAllByRole('heading', { level: 3 })
        .map((h) => h.textContent),
    ).toEqual(['media', 'observability']);

    const grafana = within(applications).getByRole('link', { name: /Grafana/ });
    expect(grafana.getAttribute('href')).toBe('https://grafana.example.com');
    expect(grafana.getAttribute('target')).toBe('_blank');
    expect(grafana.getAttribute('rel')).toBe('noopener noreferrer');
    expect(grafana.textContent).toContain('Dashboards');

    const plex = within(applications).getByRole('link', { name: /Plex/ });
    expect(plex.hasAttribute('target')).toBe(false);

    const bookmarks = screen.getByRole('region', { name: 'Bookmarks' });
    expect(within(bookmarks).getByRole('link', { name: /Docs/ })).toBeTruthy();

    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Home lab');
    await waitFor(() => expect(document.title).toBe('Home lab'));
  });

  it('follows changes from the event stream', async () => {
    renderWith(serverState({ tiles: [tile({ name: 'Plex' })] }));
    expect(await screen.findByRole('link', { name: /Plex/ })).toBeTruthy();

    act(() => FakeStream.last.emit('tile.upsert', tile({ name: 'Grafana' })));
    expect(await screen.findByRole('link', { name: /Grafana/ })).toBeTruthy();

    act(() => FakeStream.last.emit('tile.delete', { id: 'c/apps/ns/Plex' }));
    await waitFor(() => expect(screen.queryByRole('link', { name: /Plex/ })).toBeNull());
  });

  it('keeps the tiles and says so while reconnecting', async () => {
    renderWith(serverState({ tiles: [tile({ name: 'Plex' })] }));
    act(() => FakeStream.last.fail('drop'));
    expect(await screen.findByText(/Reconnecting/)).toBeTruthy();
    expect(screen.getByRole('link', { name: /Plex/ })).toBeTruthy();

    act(() => FakeStream.last.emit('snapshot', serverState({ tiles: [tile({ name: 'Plex' })] })));
    await waitFor(() => expect(screen.queryByText(/Reconnecting/)).toBeNull());
  });

  it('shows loading until the first snapshot', () => {
    render(<App open={openFake} />);
    expect(screen.getByText('Loading…')).toBeTruthy();
  });

  it('asks for a reload when the server speaks another protocol', async () => {
    render(<App open={openFake} />);
    act(() => FakeStream.last.emit('snapshot', { ...serverState(), schemaVersion: 2 }));
    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain('newer protocol');
    expect(within(alert).getByRole('button', { name: 'Reload' })).toBeTruthy();
  });

  it('closes the stream when the page goes away', async () => {
    const view = renderWith(serverState());
    view.unmount();
    await waitFor(() => expect(FakeStream.last.closed).toBe(true));
  });

  it('does not link a tile whose URL would run script', async () => {
    renderWith(serverState({ tiles: [tile({ name: 'Evil', url: 'javascript:alert(1)' })] }));
    expect(await screen.findByText('Evil')).toBeTruthy();
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('renders tile text as text', async () => {
    renderWith(serverState({ tiles: [tile({ name: '<img src=x id=injected>' })] }));
    expect(await screen.findByText('<img src=x id=injected>')).toBeTruthy();
    expect(document.getElementById('injected')).toBeNull();
  });

  it('applies the tag filter from the URL path', async () => {
    window.history.pushState({}, '', '/admin');
    try {
      renderWith(
        serverState({
          tiles: [
            tile({ name: 'Everyone' }),
            tile({ name: 'Admins', tags: ['admin'] }),
            tile({ name: 'Developers', tags: ['dev'] }),
          ],
        }),
      );
      expect(await screen.findByRole('link', { name: /Everyone/ })).toBeTruthy();
      expect(screen.getByRole('link', { name: /Admins/ })).toBeTruthy();
      expect(screen.queryByRole('link', { name: /Developers/ })).toBeNull();
    } finally {
      window.history.pushState({}, '', '/');
    }
  });

  it('hides tagged tiles when the URL has no tags', async () => {
    renderWith(
      serverState({ tiles: [tile({ name: 'Everyone' }), tile({ name: 'Admins', tags: ['admin'] })] }),
    );
    expect(await screen.findByRole('link', { name: /Everyone/ })).toBeTruthy();
    expect(screen.queryByRole('link', { name: /Admins/ })).toBeNull();
  });

  it('says so when there is nothing to show', async () => {
    renderWith(serverState());
    expect(await screen.findByText(/no applications or bookmarks/)).toBeTruthy();
  });

  it('says so while the cluster is still being read', async () => {
    renderWith(serverState({ clusters: [{ name: 'local', local: true, state: 'syncing' }] }));
    expect(await screen.findByText(/Still reading the cluster/)).toBeTruthy();
    expect(screen.queryByText(/no applications or bookmarks/)).toBeNull();

    act(() =>
      FakeStream.last.emit('cluster.status', { name: 'local', local: true, state: 'connected' }),
    );
    await waitFor(() => expect(screen.queryByText(/Still reading the cluster/)).toBeNull());
  });

  it('marks a tile whose probe failed, and only that', async () => {
    renderWith(
      serverState({
        tiles: [
          tile({ name: 'Down', available: false }),
          tile({ name: 'Up', available: true }),
          tile({ name: 'Unknown' }),
        ],
      }),
    );
    const down = await screen.findByRole('link', { name: /Down/ });
    expect(down.textContent).toContain('Offline');
    expect(screen.getByRole('link', { name: /Up/ }).textContent).not.toContain('Offline');
    expect(screen.getByRole('link', { name: /Unknown/ }).textContent).not.toContain('Offline');

    act(() => FakeStream.last.emit('tile.upsert', tile({ name: 'Down', available: true })));
    await waitFor(() =>
      expect(screen.getByRole('link', { name: /Down/ }).textContent).not.toContain('Offline'),
    );
  });

  it('falls back to an initial when the icon fails to load', async () => {
    const { container } = renderWith(
      serverState({ tiles: [tile({ name: 'plex', icon: 'mdi:plex' })] }),
    );
    await screen.findByRole('link', { name: /plex/ });
    const image = container.querySelector('img.tile-icon')!;
    expect(image.getAttribute('src')).toContain('api.iconify.design/mdi/plex.svg');
    fireEvent.error(image);
    await waitFor(() =>
      expect(container.querySelector('.tile-icon-fallback')?.textContent).toBe('P'),
    );
  });
});
