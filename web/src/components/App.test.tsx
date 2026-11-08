import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/preact';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setLanguage } from '../i18n';
import { prefs, reloadPrefs, updatePrefs } from '../prefs';
import { GRACE_MS, reset } from '../state';
import { FakeStream, openFake, serverState, tile } from '../testing';
import type { ServerState } from '../types';
import { App } from './App';

// Renders the page and delivers a snapshot, as the server does on connect.
function renderWith(state: ServerState) {
  const view = render(<App open={openFake} />);
  act(() => FakeStream.last.emit('snapshot', state));
  return view;
}

beforeEach(async () => {
  reset();
  FakeStream.opened = [];
  window.localStorage.clear();
  reloadPrefs();
  await setLanguage('en-US');
});
afterEach(() => cleanup());

describe('App', () => {
  it('puts applications and bookmarks on tabs, opening on the applications', async () => {
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

    const tabs = await screen.findAllByRole('tab');
    expect(tabs.map((tab) => tab.textContent)).toEqual(['Applications', 'Bookmarks']);
    expect(tabs[0]!.getAttribute('aria-selected')).toBe('true');

    const applications = screen.getByRole('tabpanel', { name: 'Applications' });
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
    expect(within(applications).getByRole('link', { name: /Plex/ }).hasAttribute('target')).toBe(false);
    expect(screen.queryByRole('link', { name: /Docs/ })).toBeNull();

    fireEvent.click(tabs[1]!);
    const bookmarks = await screen.findByRole('tabpanel', { name: 'Bookmarks' });
    expect(within(bookmarks).getByRole('link', { name: /Docs/ })).toBeTruthy();
    expect(screen.queryByRole('link', { name: /Plex/ })).toBeNull();

    // The arrow keys move between the tabs.
    fireEvent.keyDown(screen.getByRole('tablist'), { key: 'ArrowLeft' });
    expect(await screen.findByRole('tabpanel', { name: 'Applications' })).toBeTruthy();

    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Home lab');
    await waitFor(() => expect(document.title).toBe('Home lab'));
  });

  it('shows the bookmarks straight away when there are no applications', async () => {
    renderWith(serverState({ tiles: [tile({ name: 'Docs', kind: 'bookmark', group: 'reference' })] }));
    const bookmarks = await screen.findByRole('region', { name: 'Bookmarks' });
    expect(within(bookmarks).getByRole('link', { name: /Docs/ })).toBeTruthy();
    expect(screen.queryByRole('tablist')).toBeNull();
  });

  it('falls back to the other tab when the chosen one becomes empty', async () => {
    renderWith(
      serverState({ tiles: [tile({ name: 'Plex' }), tile({ name: 'Docs', kind: 'bookmark', group: 'reference' })] }),
    );
    fireEvent.click((await screen.findAllByRole('tab'))[1]!);
    expect(await screen.findByRole('link', { name: /Docs/ })).toBeTruthy();
    act(() => FakeStream.last.emit('tile.delete', { id: 'c/apps/ns/Docs' }));
    expect(await screen.findByRole('region', { name: 'Applications' })).toBeTruthy();
    expect(screen.getByRole('link', { name: /Plex/ })).toBeTruthy();
  });

  it('shows tags on tiles when asked to', async () => {
    renderWith(serverState({ tiles: [tile({ name: 'Plex', tags: ['home', 'media'] })] }));
    window.history.pushState({}, '', '/home');
    try {
      cleanup();
      renderWith(serverState({ tiles: [tile({ name: 'Plex', tags: ['home', 'media'] })] }));
      await screen.findByRole('link', { name: /Plex/ });
      expect(screen.queryByLabelText('Tags: home, media')).toBeNull();
      act(() => updatePrefs((p) => ({ ...p, layout: { ...p.layout, showTags: true } })));
      expect((await screen.findByLabelText('Tags: home, media')).textContent).toBe('homemedia');
    } finally {
      window.history.pushState({}, '', '/');
    }
  });

  it('applies the handwritten font and the content panel to the document', async () => {
    renderWith(serverState());
    const root = document.documentElement;
    await waitFor(() => expect(root.dataset.font).toBe('default'));
    expect(root.dataset.overlay).toBe('true'); // the default background has a panel
    act(() => updatePrefs((p) => ({ ...p, background: { ...p.background, type: 'theme' } })));
    await waitFor(() => expect(root.dataset.overlay).toBe('false')); // the theme background has none
    act(() =>
      updatePrefs((p) => ({
        ...p,
        handwrittenFont: true,
        background: { ...p.background, type: 'geopattern', overlayOpacity: 0.6 },
      })),
    );
    await waitFor(() => expect(root.dataset.font).toBe('handwritten'));
    expect(root.dataset.overlay).toBe('true');
    expect(root.style.getPropertyValue('--overlay')).toBe('60%');
    expect(root.dataset.overlayBlur).toBe('true'); // on unless turned off
    act(() => updatePrefs((p) => ({ ...p, background: { ...p.background, overlayBlur: false } })));
    await waitFor(() => expect(root.dataset.overlayBlur).toBe('false'));
    expect(document.querySelector('.background-pattern')).not.toBeNull();
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
    vi.useFakeTimers();
    try {
      act(() => FakeStream.last.fail('drop'));
      expect(screen.queryByText(/Reconnecting/)).toBeNull();
      act(() => void vi.advanceTimersByTime(GRACE_MS));
    } finally {
      vi.useRealTimers();
    }
    expect(await screen.findByText(/Reconnecting/)).toBeTruthy();
    expect(screen.getByRole('link', { name: /Plex/ })).toBeTruthy();

    act(() => FakeStream.last.emit('snapshot', serverState({ tiles: [tile({ name: 'Plex' })] })));
    await waitFor(() => expect(screen.queryByText(/Reconnecting/)).toBeNull());
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
    expect(screen.queryByRole('link', { name: /Evil/ })).toBeNull();
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

  it('moves a favorite out of its group into the favorites section', async () => {
    renderWith(serverState({ tiles: [tile({ name: 'Plex' }), tile({ name: 'Grafana' })] }));
    expect(screen.queryByRole('region', { name: 'Favorites' })).toBeNull();

    const add = await screen.findByRole('button', { name: 'Add Plex to favorites' });
    expect(add.getAttribute('aria-pressed')).toBe('false');
    fireEvent.click(add);

    const favorites = await screen.findByRole('region', { name: 'Favorites' });
    expect(within(favorites).getByRole('link', { name: /Plex/ })).toBeTruthy();
    expect(within(favorites).queryByRole('link', { name: /Grafana/ })).toBeNull();
    // It is shown once: not in its group any more.
    const applications = screen.getByRole('region', { name: 'Applications' });
    expect(within(applications).queryByRole('link', { name: /Plex/ })).toBeNull();
    expect(within(applications).getByRole('link', { name: /Grafana/ })).toBeTruthy();
    expect(screen.getAllByRole('link', { name: /Plex/ })).toHaveLength(1);
    expect(prefs.value.favorites).toEqual(['c/apps/ns/Plex']);

    fireEvent.click(within(favorites).getByRole('button', { name: 'Remove Plex from favorites' }));
    await waitFor(() => expect(screen.queryByRole('region', { name: 'Favorites' })).toBeNull());
    expect(within(screen.getByRole('region', { name: 'Applications' })).getByRole('link', { name: /Plex/ })).toBeTruthy();
  });

  it('gives each tab its own favorites row, below the tabs', async () => {
    updatePrefs((p) => ({ ...p, favorites: ['c/apps/ns/Docs', 'c/apps/ns/Plex'] }));
    renderWith(
      serverState({
        tiles: [
          tile({ name: 'Plex' }),
          tile({ name: 'Grafana' }),
          tile({ name: 'Docs', kind: 'bookmark', group: 'reference' }),
        ],
      }),
    );
    // A kind keeps its tab even when all of it is in the favorites.
    const tabs = await screen.findAllByRole('tab');
    expect(tabs.map((tab) => tab.textContent)).toEqual(['Applications', 'Bookmarks']);

    const favorites = () => screen.getByRole('region', { name: 'Favorites' });
    expect(within(favorites()).getByRole('link', { name: /Plex/ })).toBeTruthy();
    expect(within(favorites()).queryByRole('link', { name: /Docs/ })).toBeNull();
    // The tabs come first in the page, then the favorites.
    const position = screen.getByRole('tablist').compareDocumentPosition(favorites());
    expect(position & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    // The row has no visible heading.
    expect(within(favorites()).queryByRole('heading')).toBeNull();

    fireEvent.click(tabs[1]!);
    await waitFor(() => expect(within(favorites()).getByRole('link', { name: /Docs/ })).toBeTruthy());
    expect(within(favorites()).queryByRole('link', { name: /Plex/ })).toBeNull();
  });

  it('sizes each list for the fewest rows on auto, and to the chosen number otherwise', async () => {
    const eight = Array.from({ length: 8 }, (_, i) => tile({ name: `Tool ${i}`, group: 'tools' }));
    renderWith(serverState({ tiles: [...eight, tile({ name: 'Plex', group: 'media' }), tile({ name: 'Sonarr', group: 'media' })] }));
    await screen.findByRole('link', { name: /Plex/ });
    const columns = (group: string) =>
      (screen.getByRole('region', { name: group }).querySelector('.tiles') as HTMLElement).style.getPropertyValue('--columns');
    // The test window is 1024 wide, which has room for four columns.
    expect(columns('tools')).toBe('4'); // 8 tiles: two rows of four
    expect(columns('media')).toBe('2'); // 2 tiles: one row

    act(() => updatePrefs((p) => ({ ...p, layout: { ...p.layout, columns: 3 } })));
    await waitFor(() => expect(columns('tools')).toBe('3'));
    expect(columns('media')).toBe('3');

    act(() => updatePrefs((p) => ({ ...p, layout: { ...p.layout, columns: 6 } })));
    await waitFor(() => expect(columns('tools')).toBe('4')); // never more than fit
  });

  it('sizes the favorites row to its favorites', async () => {
    updatePrefs((p) => ({ ...p, favorites: ['c/apps/ns/Plex', 'c/apps/ns/Grafana'] }));
    renderWith(serverState({ tiles: [tile({ name: 'Plex' }), tile({ name: 'Grafana' }), tile({ name: 'Other' })] }));
    const row = (await screen.findByRole('region', { name: 'Favorites' })).querySelector('.tiles') as HTMLElement;
    expect(row.className).toContain('tiles-centred');
    expect(row.style.getPropertyValue('--columns')).toBe('2');
    act(() => updatePrefs((p) => ({ ...p, layout: { ...p.layout, columns: 4 } })));
    // Two favorites never spread over more than two columns.
    await waitFor(() => expect(row.style.getPropertyValue('--columns')).toBe('2'));
  });

  it('shows placeholders until the first snapshot, and says it is loading', async () => {
    const { container } = render(<App open={openFake} />);
    expect(container.querySelector('.skeleton-page')?.getAttribute('aria-hidden')).toBe('true');
    expect(container.querySelectorAll('.skeleton-tile').length).toBeGreaterThan(5);
    expect(screen.getByRole('status').textContent).toContain('Loading…');
    act(() => FakeStream.last.emit('snapshot', serverState({ tiles: [tile({ name: 'Plex' })] })));
    await screen.findByRole('link', { name: /Plex/ });
    expect(container.querySelector('.skeleton-page')).toBeNull();
  });

  it('starts a search with whatever is typed on the page', async () => {
    renderWith(serverState({ tiles: [tile({ name: 'Plex' }), tile({ name: 'Grafana' })] }));
    await screen.findByRole('link', { name: /Plex/ });

    fireEvent.keyDown(document.body, { key: 'p' });
    const dialog = await screen.findByRole('dialog', { name: 'Search applications and bookmarks' });
    const input = within(dialog).getByRole('combobox') as HTMLInputElement;
    expect(input.value).toBe('p');
    // Plex comes first: its name starts with what was typed.
    expect(within(dialog).getAllByRole('option')[0]!.querySelector('.spotlight-label')?.textContent).toBe('Plex');
    // More typing goes to the field, not to a second dialog.
    fireEvent.keyDown(input, { key: 'l' });
    expect(screen.getAllByRole('dialog')).toHaveLength(1);
  });

  it('does not start a search for shortcuts, space or keys that are not characters', async () => {
    renderWith(serverState({ tiles: [tile({ name: 'Plex' })] }));
    await screen.findByRole('link', { name: /Plex/ });
    for (const init of [
      { key: ' ' },
      { key: 'Tab' },
      { key: 'ArrowDown' },
      { key: 'Enter' },
      { key: 'c', ctrlKey: true },
      { key: 'r', metaKey: true },
      { key: 'd', altKey: true },
    ]) {
      fireEvent.keyDown(document.body, init);
    }
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  describe('favorites order', () => {
    const three = () =>
      serverState({ tiles: [tile({ name: 'Alpha' }), tile({ name: 'Beta' }), tile({ name: 'Gamma' })] });
    const order = () =>
      within(screen.getByRole('region', { name: 'Favorites' }))
        .getAllByRole('link')
        .map((link) => link.querySelector('.tile-name')?.textContent);
    beforeEach(() =>
      updatePrefs((p) => ({ ...p, favorites: ['c/apps/ns/Gamma', 'c/apps/ns/Alpha', 'c/apps/ns/Beta'] })),
    );

    it('is the order they were added in, not alphabetical', async () => {
      renderWith(three());
      await screen.findByRole('region', { name: 'Favorites' });
      expect(order()).toEqual(['Gamma', 'Alpha', 'Beta']);
    });

    it('changes with the move buttons and is announced and remembered', async () => {
      renderWith(three());
      await screen.findByRole('region', { name: 'Favorites' });
      expect((screen.getByRole('button', { name: 'Move Gamma earlier' }) as HTMLButtonElement).disabled).toBe(true);
      expect((screen.getByRole('button', { name: 'Move Beta later' }) as HTMLButtonElement).disabled).toBe(true);

      fireEvent.click(screen.getByRole('button', { name: 'Move Gamma later' }));
      await waitFor(() => expect(order()).toEqual(['Alpha', 'Gamma', 'Beta']));
      expect(within(screen.getByRole('region', { name: 'Favorites' })).getByRole('status').textContent).toBe(
        'Gamma is now favorite 2 of 3.',
      );
      fireEvent.click(screen.getByRole('button', { name: 'Move Beta earlier' }));
      await waitFor(() => expect(order()).toEqual(['Alpha', 'Beta', 'Gamma']));

      reloadPrefs();
      expect(prefs.value.favorites).toEqual(['c/apps/ns/Alpha', 'c/apps/ns/Beta', 'c/apps/ns/Gamma']);
    });

    it('changes by dragging one favorite onto another', async () => {
      renderWith(three());
      const region = await screen.findByRole('region', { name: 'Favorites' });
      const items = () => within(region).getAllByRole('listitem');
      expect(items()[0]!.getAttribute('draggable')).toBe('true');

      fireEvent.dragStart(items()[2]!); // Beta
      fireEvent.dragOver(items()[0]!);
      await waitFor(() => expect(items()[0]!.className).toBe('drop-target'));
      fireEvent.drop(items()[0]!); // onto Gamma
      await waitFor(() => expect(order()).toEqual(['Beta', 'Gamma', 'Alpha']));
      expect(items().every((item) => item.className === '')).toBe(true);
    });

    it('keeps favorites that are hidden right now in their place', async () => {
      // Beta is not on the page, for example because of the tag filter.
      renderWith(serverState({ tiles: [tile({ name: 'Alpha' }), tile({ name: 'Gamma' })] }));
      await screen.findByRole('region', { name: 'Favorites' });
      expect(order()).toEqual(['Gamma', 'Alpha']);
      fireEvent.click(screen.getByRole('button', { name: 'Move Alpha earlier' }));
      await waitFor(() => expect(order()).toEqual(['Alpha', 'Gamma']));
      expect(prefs.value.favorites).toContain('c/apps/ns/Beta');
    });

    it('offers no reordering for a single favorite', async () => {
      updatePrefs((p) => ({ ...p, favorites: ['c/apps/ns/Alpha'] }));
      renderWith(three());
      const region = await screen.findByRole('region', { name: 'Favorites' });
      expect(within(region).queryByRole('button', { name: /Move/ })).toBeNull();
      expect(within(region).getByRole('listitem').getAttribute('draggable')).toBe('false');
    });
  });

  it('collapses and expands a group', async () => {
    renderWith(serverState({ tiles: [tile({ name: 'Plex', group: 'media' })] }));
    const toggle = await screen.findByRole('button', { name: 'media' });
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    fireEvent.click(toggle);
    await waitFor(() => expect(screen.queryByRole('link', { name: /Plex/ })).toBeNull());
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(prefs.value.collapsed).toEqual(['applications:media']);
    fireEvent.click(toggle);
    expect(await screen.findByRole('link', { name: /Plex/ })).toBeTruthy();
  });

  it('applies the theme of the chosen mode to the document', async () => {
    renderWith(serverState());
    const root = document.documentElement;
    await waitFor(() => expect(root.dataset.mode).toBe('light'));
    expect(root.style.getPropertyValue('--bg')).toBe('#F8F6F1');

    act(() => updatePrefs((p) => ({ ...p, theme: 'dark' })));
    await waitFor(() => expect(root.dataset.mode).toBe('dark'));
    expect(root.style.getPropertyValue('--bg')).toBe('#232530');
    expect(root.style.getPropertyValue('--accent')).toBe('#E95678');
  });

  it('applies layout and accessibility preferences to the document', async () => {
    renderWith(serverState());
    act(() =>
      updatePrefs((p) => ({
        ...p,
        layout: { ...p.layout, columns: 3, spacing: 'tight', compact: true },
        accessibility: { fontScale: 130, highContrast: true },
      })),
    );
    const root = document.documentElement;
    await waitFor(() => expect(root.dataset.spacing).toBe('tight'));
    expect(root.dataset.boxes).toBe('false'); // tiles have no box unless asked for
    act(() => updatePrefs((p) => ({ ...p, layout: { ...p.layout, showBoxes: true } })));
    await waitFor(() => expect(root.dataset.boxes).toBe('true'));
    expect(root.dataset.compact).toBe('true');
    expect(root.dataset.contrast).toBe('high');
    expect(root.style.fontSize).toBe('130%');
  });

  it('can hide descriptions, status and unreachable applications', async () => {
    renderWith(
      serverState({ tiles: [tile({ name: 'Down', info: 'About down', available: false }), tile({ name: 'Up' })] }),
    );
    expect(await screen.findByText('About down')).toBeTruthy();
    expect(screen.getByText('Offline')).toBeTruthy();

    act(() => updatePrefs((p) => ({ ...p, layout: { ...p.layout, showDescription: false, showStatus: false } })));
    await waitFor(() => expect(screen.queryByText('About down')).toBeNull());
    expect(screen.queryByText('Offline')).toBeNull();
    expect(screen.getByRole('link', { name: /Down/ })).toBeTruthy();

    act(() => updatePrefs((p) => ({ ...p, layout: { ...p.layout, hideUnreachable: true } })));
    await waitFor(() => expect(screen.queryByRole('link', { name: /Down/ })).toBeNull());
    expect(screen.getByRole('link', { name: /Up/ })).toBeTruthy();
  });

  it('shows the page in the chosen language', async () => {
    renderWith(serverState({ tiles: [tile({ name: 'Plex' })] }));
    expect(await screen.findByRole('region', { name: 'Applications' })).toBeTruthy();
    act(() => updatePrefs((p) => ({ ...p, language: 'sv-SE' })));
    expect(await screen.findByRole('region', { name: 'Program' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Lägg till Plex bland favoriter' })).toBeTruthy();
    expect(document.documentElement.lang).toBe('sv-SE');
  });

  it("uses the server's default language when the visitor has not chosen", async () => {
    const state = serverState({ tiles: [tile({ name: 'Plex' })] });
    renderWith({ ...state, config: { ...state.config, defaultLanguage: 'sv-SE' } });
    // jsdom's browser language is en-US, which is available, so it wins.
    expect(await screen.findByRole('region', { name: 'Applications' })).toBeTruthy();
  });

  it('opens search with the keyboard and settings from the header', async () => {
    renderWith(serverState({ tiles: [tile({ name: 'Plex' })] }));
    await screen.findByRole('link', { name: /Plex/ });
    expect(screen.queryByRole('dialog')).toBeNull();

    fireEvent.keyDown(document.body, { key: '/' });
    expect(await screen.findByRole('dialog', { name: 'Search applications and bookmarks' })).toBeTruthy();
    fireEvent(screen.getByRole('dialog'), new Event('close'));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());

    fireEvent.keyDown(document.body, { key: 'k', ctrlKey: true });
    expect(await screen.findByRole('dialog', { name: 'Search applications and bookmarks' })).toBeTruthy();
    fireEvent(screen.getByRole('dialog'), new Event('close'));

    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
    expect(await screen.findByRole('dialog', { name: 'Settings' })).toBeTruthy();
  });

  it('does not open search while typing in a field', async () => {
    renderWith(serverState());
    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
    const dialog = await screen.findByRole('dialog', { name: 'Settings' });
    fireEvent.keyDown(within(dialog).getAllByRole('combobox')[0]!, { key: '/' });
    expect(screen.getAllByRole('dialog')).toHaveLength(1);
  });

  it('has a skip link to the content', () => {
    renderWith(serverState());
    const skip = screen.getByRole('link', { name: 'Skip to main content' });
    expect(skip.getAttribute('href')).toBe('#content');
    expect(document.getElementById('content')?.tagName).toBe('MAIN');
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
