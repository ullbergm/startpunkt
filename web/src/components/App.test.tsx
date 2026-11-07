import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/preact';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { tile } from '../group.test';
import { reset } from '../state';
import type { ServerState } from '../types';
import { App } from './App';

function serverState(overrides: Partial<ServerState> = {}): ServerState {
  return {
    schemaVersion: 1,
    tiles: [],
    clusters: [{ name: 'local', local: true, state: 'connected' }],
    config: { title: 'Home lab' },
    editing: { available: false },
    ...overrides,
  };
}

function respondWith(body: unknown, init: ResponseInit = {}) {
  return vi.fn(async () =>
    new Response(JSON.stringify(body), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ETag: '"1"' },
      ...init,
    }),
  );
}

beforeEach(() => reset());
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('App', () => {
  it('renders applications and bookmarks in their groups', async () => {
    vi.stubGlobal(
      'fetch',
      respondWith(
        serverState({
          tiles: [
            tile({ name: 'Grafana', group: 'observability', info: 'Dashboards', url: 'https://grafana.example.com', targetBlank: true }),
            tile({ name: 'Plex', group: 'media', url: 'https://plex.example.com' }),
            tile({ name: 'Docs', group: 'reference', kind: 'bookmark', url: 'https://kubernetes.io' }),
          ],
        }),
      ),
    );
    render(<App />);

    const applications = await screen.findByRole('region', { name: 'Applications' });
    expect(
      within(applications).getAllByRole('heading', { level: 3 }).map((h) => h.textContent),
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

  it('does not link a tile whose URL would run script', async () => {
    vi.stubGlobal(
      'fetch',
      respondWith(serverState({ tiles: [tile({ name: 'Evil', url: 'javascript:alert(1)' })] })),
    );
    render(<App />);
    expect(await screen.findByText('Evil')).toBeTruthy();
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('renders tile text as text', async () => {
    vi.stubGlobal(
      'fetch',
      respondWith(serverState({ tiles: [tile({ name: '<img src=x id=injected>' })] })),
    );
    render(<App />);
    expect(await screen.findByText('<img src=x id=injected>')).toBeTruthy();
    expect(document.getElementById('injected')).toBeNull();
  });

  it('applies the tag filter from the URL path', async () => {
    vi.stubGlobal(
      'fetch',
      respondWith(
        serverState({
          tiles: [
            tile({ name: 'Everyone' }),
            tile({ name: 'Admins', tags: ['admin'] }),
            tile({ name: 'Developers', tags: ['dev'] }),
          ],
        }),
      ),
    );
    window.history.pushState({}, '', '/admin');
    try {
      render(<App />);
      expect(await screen.findByRole('link', { name: /Everyone/ })).toBeTruthy();
      expect(screen.getByRole('link', { name: /Admins/ })).toBeTruthy();
      expect(screen.queryByRole('link', { name: /Developers/ })).toBeNull();
    } finally {
      window.history.pushState({}, '', '/');
    }
  });

  it('hides tagged tiles when the URL has no tags', async () => {
    vi.stubGlobal(
      'fetch',
      respondWith(serverState({ tiles: [tile({ name: 'Everyone' }), tile({ name: 'Admins', tags: ['admin'] })] })),
    );
    render(<App />);
    expect(await screen.findByRole('link', { name: /Everyone/ })).toBeTruthy();
    expect(screen.queryByRole('link', { name: /Admins/ })).toBeNull();
  });

  it('says so when there is nothing to show', async () => {
    vi.stubGlobal('fetch', respondWith(serverState()));
    render(<App />);
    expect(await screen.findByText(/no applications or bookmarks/)).toBeTruthy();
  });

  it('says so while the cluster is still being read', async () => {
    vi.stubGlobal(
      'fetch',
      respondWith(serverState({ clusters: [{ name: 'local', local: true, state: 'syncing' }] })),
    );
    render(<App />);
    expect(await screen.findByText(/Still reading the cluster/)).toBeTruthy();
    expect(screen.queryByText(/no applications or bookmarks/)).toBeNull();
  });

  it('reports a failed load and recovers on retry', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response('nope', { status: 503 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify(serverState({ tiles: [tile({ name: 'Plex' })] })), {
          status: 200,
        }),
      );
    vi.stubGlobal('fetch', fetchMock);
    render(<App />);

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain('503');
    fireEvent.click(within(alert).getByRole('button', { name: 'Try again' }));

    expect(await screen.findByRole('link', { name: /Plex/ })).toBeTruthy();
    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull());
  });

  it('falls back to an initial when the icon fails to load', async () => {
    vi.stubGlobal(
      'fetch',
      respondWith(serverState({ tiles: [tile({ name: 'plex', icon: 'mdi:plex' })] })),
    );
    const { container } = render(<App />);
    await screen.findByRole('link', { name: /plex/ });
    const image = container.querySelector('img.tile-icon')!;
    expect(image.getAttribute('src')).toContain('api.iconify.design/mdi/plex.svg');
    fireEvent.error(image);
    await waitFor(() => expect(container.querySelector('.tile-icon-fallback')?.textContent).toBe('P'));
  });
});
