import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/preact';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { editMode, fixed } from '../editing';
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

// Most tests of the tiles' controls start with the page being edited.
const edit = () => fireEvent.click(screen.getByRole('button', { name: 'Edit the page' }));

beforeEach(async () => {
  reset();
  FakeStream.opened = [];
  window.localStorage.clear();
  reloadPrefs();
  editMode.value = false;
  fixed.value = null;
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
    expect(root.style.getPropertyValue('--overlay')).toBe('rgb(0 0 0 / 60%)');
    expect(root.dataset.overlayBlur).toBe('true'); // a light blur unless changed
    expect(root.style.getPropertyValue('--overlay-blur')).toBe('3px');
    act(() => updatePrefs((p) => ({ ...p, background: { ...p.background, overlayBlur: 20 } })));
    await waitFor(() => expect(root.style.getPropertyValue('--overlay-blur')).toBe('20px'));
    act(() => updatePrefs((p) => ({ ...p, background: { ...p.background, overlayBlur: 0 } })));
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

    edit();
    const add = await screen.findByRole('button', { name: 'Add Plex to favorites' });
    expect(add.getAttribute('aria-pressed')).toBe('false');
    fireEvent.click(add);

    const favorites = await screen.findByRole('region', { name: 'Favorites' });
    // While the page is being edited a tile is not a link, so the tiles
    // are told by their names.
    const names = (within: Element) => [...within.querySelectorAll('.tile-name')].map((name) => name.textContent);
    expect(names(favorites)).toEqual(['Plex']);
    // It is shown once: not in its group any more.
    const applications = screen.getByRole('region', { name: 'Applications' });
    expect(names(applications)).toEqual(['Grafana']);
    expect(screen.queryAllByRole('link', { name: /Plex|Grafana/ })).toHaveLength(0);
    expect(prefs.value.favorites).toEqual(['c/apps/ns/Plex']);

    fireEvent.click(within(favorites).getByRole('button', { name: 'Remove Plex from favorites' }));
    await waitFor(() => expect(screen.queryByRole('region', { name: 'Favorites' })).toBeNull());
    expect(names(screen.getByRole('region', { name: 'Applications' }))).toContain('Plex');
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

  it('gives every bookmark group the same columns, so they line up', async () => {
    const group = (name: string, count: number) =>
      Array.from({ length: count }, (_, i) =>
        tile({ name: `${name} ${i}`, kind: 'bookmark', group: name }),
      );
    renderWith(serverState({ tiles: [...group('big', 7), ...group('small', 2), ...group('one', 1)] }));
    await screen.findByRole('region', { name: 'Bookmarks' });
    const columns = (name: string) =>
      (screen.getByRole('region', { name }).querySelector('.tiles') as HTMLElement).style.getPropertyValue('--columns');
    // Seven tiles in a window with room for four columns: two rows of four.
    expect([columns('big'), columns('small'), columns('one')]).toEqual(['4', '4', '4']);
  });

  it('lets the panel behind the content decide between the light and the dark theme', async () => {
    renderWith(serverState());
    const root = document.documentElement;
    const panel = (overlayOpacity: number, theme: 'light' | 'dark' = 'light') =>
      act(() => updatePrefs((p) => ({ ...p, theme, background: { ...p.background, type: 'solid', overlayOpacity } })));

    panel(0.7, 'light'); // a black panel: light text, whatever the theme says
    await waitFor(() => expect(root.dataset.mode).toBe('dark'));
    expect(root.style.getPropertyValue('--overlay')).toBe('rgb(0 0 0 / 70%)');
    expect(root.style.getPropertyValue('--bg')).toBe('#232530');

    panel(-0.4, 'dark'); // a white panel: dark text
    await waitFor(() => expect(root.dataset.mode).toBe('light'));
    expect(root.style.getPropertyValue('--overlay')).toBe('rgb(255 255 255 / 40%)');

    panel(0, 'dark'); // no panel: the visitor's theme again
    await waitFor(() => expect(root.dataset.overlay).toBe('false'));
    expect(root.dataset.mode).toBe('dark');
    panel(0, 'light');
    await waitFor(() => expect(root.dataset.mode).toBe('light'));
  });

  it('changes the look when the theme is changed in settings, panel or not', async () => {
    renderWith(serverState());
    const root = document.documentElement;
    await waitFor(() => expect(root.dataset.mode).toBe('dark')); // the default black panel

    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
    const theme = await screen.findByRole('combobox', { name: 'Theme' });
    fireEvent.change(theme, { target: { value: 'light' } });
    await waitFor(() => expect(root.dataset.mode).toBe('light'));
    expect(root.style.getPropertyValue('--overlay')).toBe('rgb(255 255 255 / 70%)');
    expect(root.style.getPropertyValue('--bg')).toBe('#F8F6F1');

    fireEvent.change(theme, { target: { value: 'dark' } });
    await waitFor(() => expect(root.dataset.mode).toBe('dark'));
    expect(root.style.getPropertyValue('--overlay')).toBe('rgb(0 0 0 / 70%)');
  });

  it('gives icons the secondary colour of the theme, not the colour of the names', async () => {
    updatePrefs((p) => ({ ...p, background: { ...p.background, type: 'theme' } }));
    const { container } = renderWith(serverState({ tiles: [tile({ name: 'Plex', icon: 'mdi:plex' })] }));
    await screen.findByRole('link', { name: /Plex/ });
    await waitFor(() =>
      expect(container.querySelector('img.tile-icon')?.getAttribute('src')).toContain('color=%23696969'),
    );
    cleanup();
    const own = renderWith(serverState({ tiles: [tile({ name: 'Plex', icon: 'mdi:plex', iconColor: 'orange' })] }));
    await screen.findByRole('link', { name: /Plex/ });
    expect(own.container.querySelector('img.tile-icon')?.getAttribute('src')).toContain('color=orange');
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

  it('shows the controls of the tiles only while the page is being edited', async () => {
    updatePrefs((p) => ({ ...p, favorites: ['c/apps/ns/Plex', 'c/apps/ns/Grafana'] }));
    renderWith(serverState({ tiles: [tile({ name: 'Plex' }), tile({ name: 'Grafana' }), tile({ name: 'Wiki' })] }));
    await screen.findByRole('link', { name: /Wiki/ });
    const controls = () => screen.queryAllByRole('button', { name: /favorites|^Move / });
    expect(controls()).toHaveLength(0);
    // Without an edit key there is nothing to add or unlock.
    edit();
    expect(controls()).toHaveLength(3 + 4);
    expect(screen.queryByRole('button', { name: 'Add' })).toBeNull();
    expect(screen.queryByRole('button', { name: /ock editing$/ })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Done editing' }));
    expect(controls()).toHaveLength(0);
    // In it a tile is not a link: a click is about the tile, and says here
    // that it cannot be changed, with the link it would otherwise be.
    edit();
    expect(screen.queryByRole('link', { name: /Wiki/ })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Wiki, cannot be changed here' }));
    const notice = await screen.findByRole('dialog', { name: 'Wiki cannot be changed here' });
    expect(within(notice).getByText('Editing is not turned on for this instance.')).toBeTruthy();
    expect(within(notice).getByRole('link', { name: 'Open Wiki' }).getAttribute('href')).toBe('https://example.com');
    fireEvent.click(within(notice).getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    fireEvent.click(screen.getByRole('button', { name: 'Done editing' }));
    expect(screen.getByRole('link', { name: /Wiki/ })).toBeTruthy();
    // Escape leaves it as well.
    edit();
    fireEvent.keyDown(document.body, { key: 'Escape' });
    await waitFor(() => expect(controls()).toHaveLength(0));
    expect(screen.getByRole('button', { name: 'Edit the page' })).toBeTruthy();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  describe('favorites order', () => {
    const three = () =>
      serverState({ tiles: [tile({ name: 'Alpha' }), tile({ name: 'Beta' }), tile({ name: 'Gamma' })] });
    const order = () =>
      [...screen.getByRole('region', { name: 'Favorites' }).querySelectorAll('.tile-name')].map((name) => name.textContent);
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
      edit();
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
      expect(items()[0]!.getAttribute('draggable')).toBe('false');
      edit();
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
      edit();
      fireEvent.click(screen.getByRole('button', { name: 'Move Alpha earlier' }));
      await waitFor(() => expect(order()).toEqual(['Alpha', 'Gamma']));
      expect(prefs.value.favorites).toContain('c/apps/ns/Beta');
    });

    it('offers no reordering for a single favorite', async () => {
      updatePrefs((p) => ({ ...p, favorites: ['c/apps/ns/Alpha'] }));
      renderWith(three());
      const region = await screen.findByRole('region', { name: 'Favorites' });
      edit();
      expect(within(region).getByRole('button', { name: 'Remove Alpha from favorites' })).toBeTruthy();
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
    // On the theme background, where no panel decides the mode.
    updatePrefs((p) => ({ ...p, background: { ...p.background, type: 'theme' } }));
    renderWith(serverState());
    const root = document.documentElement;
    await waitFor(() => expect(root.dataset.mode).toBe('light'));
    expect(root.style.getPropertyValue('--bg')).toBe('#F8F6F1');

    act(() => updatePrefs((p) => ({ ...p, theme: 'dark' })));
    await waitFor(() => expect(root.dataset.mode).toBe('dark'));
    expect(root.style.getPropertyValue('--bg')).toBe('#232530');
    expect(root.style.getPropertyValue('--accent')).toBe('#E95678');
  });

  it('applies a chosen colour scheme in place of the theme of the server', async () => {
    updatePrefs((p) => ({ ...p, colors: 'ocean', theme: 'dark', background: { ...p.background, type: 'theme' } }));
    renderWith(serverState());
    const root = document.documentElement;
    await waitFor(() => expect(root.style.getPropertyValue('--bg')).toBe('#0F1B2A'));

    act(() => updatePrefs((p) => ({ ...p, theme: 'light' })));
    await waitFor(() => expect(root.style.getPropertyValue('--bg')).toBe('#F2F7FB'));

    act(() => updatePrefs((p) => ({ ...p, colors: 'default' })));
    await waitFor(() => expect(root.style.getPropertyValue('--bg')).toBe('#F8F6F1'));
  });

  it('applies layout and accessibility preferences to the document', async () => {
    renderWith(serverState());
    act(() =>
      updatePrefs((p) => ({
        ...p,
        layout: { ...p.layout, columns: 3 },
        accessibility: { fontScale: 130, highContrast: true },
      })),
    );
    const root = document.documentElement;
    await waitFor(() => expect(root.dataset.contrast).toBe('high'));
    expect(root.dataset.boxes).toBe('false'); // tiles have no box unless asked for
    expect(root.dataset.hover).toBe('false'); // nor a hover effect
    act(() => updatePrefs((p) => ({ ...p, layout: { ...p.layout, hoverEffect: true } })));
    await waitFor(() => expect(root.dataset.hover).toBe('true'));
    act(() => updatePrefs((p) => ({ ...p, layout: { ...p.layout, showBoxes: true } })));
    await waitFor(() => expect(root.dataset.boxes).toBe('true'));
    // Settings that are gone leave nothing on the document.
    expect(root.dataset.compact).toBeUndefined();
    expect(root.dataset.spacing).toBeUndefined();
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
    fireEvent.click(screen.getByRole('button', { name: 'Redigera sidan' }));
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

  it('has no search control in the header, and keeps settings in the corner', async () => {
    renderWith(serverState({ tiles: [tile({ name: 'Plex' })] }));
    await screen.findByRole('link', { name: /Plex/ });
    const header = screen.getByRole('banner');
    expect(within(header).queryByRole('button')).toBeNull();
    const settings = screen.getByRole('button', { name: 'Settings' });
    expect(settings.closest('.corner-actions')).not.toBeNull();
    // The search button exists for touch screens only; the stylesheet hides
    // it wherever there is a keyboard to type on.
    expect(screen.getByRole('button', { name: 'Search' }).className).toContain('touch-only');
  });

  describe('with a second cluster', () => {
    const two = (remoteState: 'connected' | 'stale' | 'syncing' = 'connected') =>
      serverState({
        clusters: [
          { name: 'local', local: true, state: 'connected' },
          { name: 'prod', local: false, state: remoteState },
        ],
        tiles: [
          tile({ id: 'local/apps/ns/grafana', name: 'Grafana', cluster: 'local' }),
          tile({ id: 'prod/apps/ns/grafana', name: 'Grafana', cluster: 'prod', editable: false }),
        ],
      });

    it('shows the same service on both clusters as one card with a pill per cluster', async () => {
      renderWith({
        ...two(),
        tiles: [
          tile({ id: 'local/apps/ns/grafana', name: 'Grafana', cluster: 'local', url: 'https://grafana.local', available: true }),
          tile({ id: 'prod/apps/ns/grafana', name: 'Grafana', cluster: 'prod', url: 'https://grafana.prod', available: false }),
          tile({ id: 'prod/apps/ns/plex', name: 'Plex', cluster: 'prod', url: 'https://plex.prod' }),
        ],
      });
      // One card for Grafana: its body opens the local one.
      const body = await screen.findByRole('link', { name: /^G?Grafana$/ });
      expect(body.getAttribute('href')).toBe('https://grafana.local');
      expect(document.querySelectorAll('.tile')).toHaveLength(2);

      // Each cluster is one click away and says whether it answers.
      const local = screen.getByRole('link', { name: 'Grafana on local, available' });
      const prod = screen.getByRole('link', { name: 'Grafana on prod, not available' });
      expect(local.getAttribute('href')).toBe('https://grafana.local');
      expect(prod.getAttribute('href')).toBe('https://grafana.prod');
      expect(local.textContent).toContain('●');
      expect(prod.textContent).toContain('○');
      // Each cluster has a colour of its own, the same on its pill and its button.
      const colour = (element: Element) => (element as HTMLElement).style.getPropertyValue('--cluster');
      expect(colour(local)).not.toBe(colour(prod));
      const chips = within(screen.getByRole('group', { name: 'Clusters to show' })).getAllByRole('button');
      expect(chips.map(colour)).toEqual([colour(local), colour(prod)]);
      // One cluster down does not mark the whole card.
      expect(body.textContent).not.toContain('Offline');

      // A service on one cluster only names it, without a second link.
      expect(screen.getByLabelText('Plex on prod').tagName).toBe('SPAN');
      expect(screen.getAllByRole('link', { name: /Plex/ })).toHaveLength(1);
    });

    it('marks a combined card offline only when every cluster is down', async () => {
      renderWith({
        ...two(),
        tiles: [
          tile({ id: 'local/apps/ns/grafana', name: 'Grafana', cluster: 'local', available: false }),
          tile({ id: 'prod/apps/ns/grafana', name: 'Grafana', cluster: 'prod', available: false }),
        ],
      });
      expect((await screen.findByRole('link', { name: /Grafana.*Offline/ })).textContent).toContain('Offline');
    });

    it('makes a combined card a favorite as a whole', async () => {
      renderWith(two());
      await screen.findAllByRole('link', { name: /Grafana/ });
      edit();
      fireEvent.click(await screen.findByRole('button', { name: 'Add Grafana to favorites' }));
      expect(prefs.value.favorites.sort()).toEqual(['local/apps/ns/grafana', 'prod/apps/ns/grafana']);
      const favorites = await screen.findByRole('region', { name: 'Favorites' });
      expect(favorites.querySelectorAll('.tile')).toHaveLength(1);
      expect(document.querySelectorAll('.tile')).toHaveLength(1); // not in its group as well
      fireEvent.click(within(favorites).getByRole('button', { name: 'Remove Grafana from favorites' }));
      expect(prefs.value.favorites).toEqual([]);
    });

    it('keeps the tiles apart when combining is turned off', async () => {
      updatePrefs((p) => ({ ...p, layout: { ...p.layout, combine: false } }));
      renderWith(two());
      await waitFor(() => expect(document.querySelectorAll('.tile')).toHaveLength(2));
      expect(screen.getByLabelText('Grafana on local').tagName).toBe('SPAN');
      expect(screen.getByLabelText('Grafana on prod').tagName).toBe('SPAN');
    });

    it('picks one cluster with a click, and adds or removes one with a modifier', async () => {
      const three = two();
      three.clusters.push({ name: 'dev', local: false, state: 'connected' });
      three.tiles.push(tile({ id: 'dev/apps/ns/wiki', name: 'Wiki', cluster: 'dev' }));
      renderWith(three);
      await screen.findByRole('link', { name: 'Grafana on prod' });
      const group = screen.getByRole('group', { name: 'Clusters to show' });
      const chip = (name: string) => within(group).getByRole('button', { name });
      const pressed = () =>
        within(group)
          .getAllByRole('button')
          .filter((button) => button.getAttribute('aria-pressed') === 'true')
          .map((button) => button.textContent);
      expect(within(group).getAllByRole('button').map((button) => button.textContent)).toEqual(['local', 'dev', 'prod']);
      expect(pressed()).toEqual(['local', 'dev', 'prod']);

      // A plain click: that cluster alone.
      fireEvent.click(chip('prod'));
      await waitFor(() => expect(pressed()).toEqual(['prod']));
      expect(prefs.value.hiddenClusters.sort()).toEqual(['dev', 'local']);
      expect(screen.queryByRole('link', { name: /Wiki/ })).toBeNull();
      expect(document.querySelector('.tile-pills')).toBeNull(); // one cluster: nothing to tell apart

      // Shift adds one, Ctrl takes one out again.
      fireEvent.click(chip('dev'), { shiftKey: true });
      await waitFor(() => expect(pressed()).toEqual(['dev', 'prod']));
      expect(screen.getByRole('link', { name: /Wiki/ })).toBeTruthy();
      fireEvent.click(chip('prod'), { ctrlKey: true });
      await waitFor(() => expect(pressed()).toEqual(['dev']));

      // A plain click on the only cluster shown brings all of them back.
      fireEvent.click(chip('dev'));
      await waitFor(() => expect(pressed()).toEqual(['local', 'dev', 'prod']));
      expect(prefs.value.hiddenClusters).toEqual([]);
    });

    it('shows only the local cluster to a visitor who has not chosen', async () => {
      const state = two();
      renderWith({ ...state, config: { ...state.config, showAllClusters: false } });
      await waitFor(() => expect(document.querySelectorAll('.tile')).toHaveLength(1));
      expect(document.querySelector('.tile-pills')).toBeNull();
      const group = screen.getByRole('group', { name: 'Clusters to show' });
      const chip = (name: string) => within(group).getByRole('button', { name });
      expect(chip('local').getAttribute('aria-pressed')).toBe('true');
      expect(chip('prod').getAttribute('aria-pressed')).toBe('false');
      // Nothing is said about a remote that is not shown.
      expect(screen.queryByText(/Not connected/)).toBeNull();

      // Switched on, it stays on.
      fireEvent.click(chip('prod'), { shiftKey: true });
      expect(await screen.findByRole('link', { name: 'Grafana on prod' })).toBeTruthy();
      expect(prefs.value.shownClusters).toEqual(['prod']);
    });

    it('gives each cluster a section of its own when asked to', async () => {
      updatePrefs((current) => ({ ...current, layout: { ...current.layout, byCluster: true } }));
      renderWith({
        ...two(),
        tiles: [
          tile({ id: 'prod/apps/ns/plex', name: 'Plex', cluster: 'prod', url: 'https://plex.prod' }),
          tile({ id: 'prod/apps/ns/grafana', name: 'Grafana', cluster: 'prod', url: 'https://grafana.prod' }),
          tile({ id: 'local/apps/ns/grafana', name: 'Grafana', cluster: 'local', url: 'https://grafana.local' }),
        ],
      });
      // The local cluster first, then the others; the kind's own heading
      // gives way to them.
      await waitFor(() =>
        expect(screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toEqual(['local', 'prod']),
      );
      // Grafana is on both, and is listed under both: nothing is combined.
      expect(document.querySelectorAll('.tile')).toHaveLength(3);
      expect(document.querySelector('.tile-pills')).toBeNull();
      const prod = screen.getByRole('region', { name: 'prod' });
      expect(within(prod).getByRole('link', { name: /Grafana/ }).getAttribute('href')).toBe('https://grafana.prod');
      expect(within(prod).getByRole('link', { name: /Plex/ })).toBeTruthy();

      // With one cluster shown there is nothing to divide.
      fireEvent.click(within(screen.getByRole('group', { name: 'Clusters to show' })).getByRole('button', { name: 'local' }));
      await waitFor(() => expect(document.querySelectorAll('.tile')).toHaveLength(1));
      expect(screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toEqual(['Applications']);
    });

    it('has no cluster buttons with a single cluster', async () => {
      renderWith(serverState({ tiles: [tile({ name: 'Grafana' })] }));
      await screen.findByRole('link', { name: /Grafana/ });
      expect(screen.queryByRole('group', { name: 'Clusters to show' })).toBeNull();
    });

    it('names no cluster when there is only one', async () => {
      renderWith(serverState({ tiles: [tile({ name: 'Grafana' })] }));
      await screen.findByRole('link', { name: /Grafana/ });
      expect(document.querySelector('.tile-pills')).toBeNull();
    });

    it('hides a cluster the visitor has turned off, and its label with it', async () => {
      renderWith(two());
      await screen.findByRole('link', { name: 'Grafana on prod' });
      fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
      fireEvent.click(await screen.findByRole('tab', { name: 'Clusters' }));
      const prod = screen.getByRole('checkbox', { name: /prod/ }) as HTMLInputElement;
      expect(prod.checked).toBe(true);
      expect(screen.getByRole('checkbox', { name: /local/ }).parentElement?.textContent).toContain('This cluster');
      fireEvent.click(prod);

      await waitFor(() => expect(screen.queryByRole('link', { name: 'Grafana on prod' })).toBeNull());
      expect(prefs.value.hiddenClusters).toEqual(['prod']);
      expect(document.querySelector('.tile-pills')).toBeNull();
    });

    it('offers no clusters tab with a single cluster', async () => {
      renderWith(serverState());
      fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
      await screen.findByRole('tab', { name: 'Appearance' });
      expect(screen.queryByRole('tab', { name: 'Clusters' })).toBeNull();
    });

    it('says when a remote is not reachable and keeps its tiles', async () => {
      renderWith(two('stale'));
      expect(await screen.findByText(/Not connected to prod/)).toBeTruthy();
      expect(screen.getByRole('link', { name: 'Grafana on prod' })).toBeTruthy();
      expect(within(screen.getByRole('group', { name: 'Clusters to show' })).getByLabelText('prod is not connected')).toBeTruthy();
      act(() => FakeStream.last.emit('cluster.status', { name: 'prod', local: false, state: 'connected' }));
      await waitFor(() => expect(screen.queryByText(/Not connected to prod/)).toBeNull());
    });

    it('treats a remote that was never reached as not connected, not as loading', async () => {
      renderWith(two('syncing'));
      expect(await screen.findByText(/Not connected to prod/)).toBeTruthy();
      expect(screen.queryByText(/Still reading the cluster/)).toBeNull();
    });

    it('says nothing about a remote the visitor has hidden', async () => {
      updatePrefs((p) => ({ ...p, hiddenClusters: ['prod'] }));
      renderWith(two('stale'));
      await waitFor(() => expect(document.querySelectorAll('.tile')).toHaveLength(1));
      expect(screen.queryByText(/Not connected to prod/)).toBeNull();
    });
  });

  it("starts a new browser from the instance's settings, and follows them", async () => {
    const state = serverState({ tiles: [tile({ name: 'Plex', tags: ['media'] })] });
    renderWith({ ...state, config: { ...state.config, defaultPreferences: { layout: { showBoxes: true, hoverEffect: true } } } });
    const root = document.documentElement;
    await waitFor(() => expect(root.dataset.boxes).toBe('true'));
    expect(root.dataset.hover).toBe('true');
    act(() => FakeStream.last.emit('config', { ...state.config, defaultPreferences: { layout: { showBoxes: false } } }));
    await waitFor(() => expect(root.dataset.boxes).toBe('false'));
    // One that has chosen keeps its choice.
    act(() => updatePrefs((p) => ({ ...p, layout: { ...p.layout, hoverEffect: true } })));
    act(() => FakeStream.last.emit('config', { ...state.config, defaultPreferences: { layout: { hoverEffect: false, showBoxes: true } } }));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(root.dataset.hover).toBe('true');
    expect(root.dataset.boxes).toBe('false');
  });

  it('follows a change of title and theme without a reload', async () => {
    updatePrefs((p) => ({ ...p, background: { ...p.background, type: 'theme' } }));
    renderWith(serverState());
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Home lab');
    const config = serverState().config;
    act(() =>
      FakeStream.last.emit('config', {
        ...config,
        title: 'Renamed',
        theme: { ...config.theme, light: { ...config.theme.light, bodyBgColor: '#ABCDEF' } },
      }),
    );
    await waitFor(() => expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Renamed'));
    await waitFor(() => expect(document.documentElement.style.getPropertyValue('--bg')).toBe('#ABCDEF'));
    expect(document.title).toBe('Renamed');
  });

  describe('what has changed', () => {
    const entry = (version: string) => ({
      version,
      date: '2026-11-13',
      sections: [{ title: 'Features', changes: [`change in ${version}`] }],
    });
    // The server's two documents: the version, and the changelog.
    const server = (version: Record<string, unknown>, releases: unknown[]) => {
      const fetcher = vi.fn(async (url: string) =>
        url === '/api/v1/version'
          ? new Response(JSON.stringify(version), { status: 200 })
          : new Response(JSON.stringify({ releases }), { status: 200 }),
      );
      return fetcher as unknown as typeof fetch;
    };
    const all = ['5.3.0', '5.2.0', '5.1.0', '5.0.0'].map(entry);
    const show = (fetcher: typeof fetch) => {
      render(<App open={openFake} fetchVersion={fetcher} />);
      act(() => FakeStream.last.emit('snapshot', serverState({ tiles: [tile({ name: 'Plex' })] })));
    };

    it('says what is new on the first visit after an update, and only then', async () => {
      window.localStorage.setItem('startpunkt.seenVersion', '5.0.0');
      const fetcher = server({ version: '5.2.0', updateAvailable: false }, all.slice(1));
      show(fetcher);
      const dialog = await screen.findByRole('dialog', { name: "What's new" });
      // What came after the version last seen, up to the one running.
      expect(within(dialog).getAllByRole('heading', { level: 3 }).map((h) => h.textContent)).toEqual([
        'v5.2.0 2026-11-13',
        'v5.1.0 2026-11-13',
      ]);
      expect(within(dialog).getByText('change in 5.2.0')).toBeTruthy();
      expect(within(dialog).queryByText('change in 5.0.0')).toBeNull();
      expect(window.localStorage.getItem('startpunkt.seenVersion')).toBe('5.2.0');
      fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }));
      await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());

      cleanup();
      show(fetcher);
      await waitFor(() => expect(screen.getByRole('contentinfo').textContent).toContain('v5.2.0'));
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(screen.queryByRole('dialog')).toBeNull();
    });

    it('says nothing to a browser that was never here, or after going back a version', async () => {
      const fetcher = server({ version: '5.2.0', updateAvailable: false }, all.slice(1));
      show(fetcher);
      await waitFor(() => expect(window.localStorage.getItem('startpunkt.seenVersion')).toBe('5.2.0'));
      expect(screen.queryByRole('dialog')).toBeNull();

      cleanup();
      show(server({ version: '5.1.0', updateAvailable: false }, all.slice(2)));
      await waitFor(() => expect(window.localStorage.getItem('startpunkt.seenVersion')).toBe('5.1.0'));
      expect(screen.queryByRole('dialog')).toBeNull();
      expect(fetcher).not.toHaveBeenCalledWith('/api/v1/changelog');
    });

    it('does not count a development build as a version', async () => {
      window.localStorage.setItem('startpunkt.seenVersion', '5.0.0');
      show(server({ version: 'dev', updateAvailable: false }, all));
      await waitFor(() => expect(screen.getByRole('contentinfo').textContent).toContain('Startpunkt dev'));
      expect(screen.queryByRole('dialog')).toBeNull();
      expect(window.localStorage.getItem('startpunkt.seenVersion')).toBe('5.0.0');
    });

    it('shows what has changed since the running version when the update notice is clicked', async () => {
      window.localStorage.setItem('startpunkt.seenVersion', '5.1.0');
      const url = 'https://github.com/ullbergm/startpunkt/releases/tag/v5.3.0';
      show(server({ version: '5.1.0', latest: 'v5.3.0', updateAvailable: true, url }, all));
      // The corner at the top is the one place that says so.
      const notices = await screen.findAllByRole('button', { name: 'Update available: v5.3.0' });
      expect(notices).toHaveLength(1);
      fireEvent.click(notices[0]!);
      const dialog = await screen.findByRole('dialog', { name: 'Update available: v5.3.0' });
      await within(dialog).findByText('change in 5.3.0');
      expect(within(dialog).getByText('change in 5.2.0')).toBeTruthy();
      expect(within(dialog).queryByText('change in 5.1.0')).toBeNull();
      expect(within(dialog).getByRole('link', { name: 'Open the release on GitHub' }).getAttribute('href')).toBe(url);
    });

    it('still links to the release when the changes are not known', async () => {
      window.localStorage.setItem('startpunkt.seenVersion', '5.1.0');
      const url = 'https://github.com/ullbergm/startpunkt/releases/tag/v5.3.0';
      show(server({ version: '5.1.0', latest: 'v5.3.0', updateAvailable: true, url }, all.slice(2)));
      fireEvent.click(await screen.findByRole('button', { name: 'Update available: v5.3.0' }));
      const dialog = await screen.findByRole('dialog', { name: 'Update available: v5.3.0' });
      expect(await within(dialog).findByText('The list of changes is not available.')).toBeTruthy();
      expect(within(dialog).getByRole('link', { name: 'Open the release on GitHub' })).toBeTruthy();
    });

    it('opens the changes of the running version from the footer', async () => {
      window.localStorage.setItem('startpunkt.seenVersion', '5.2.0');
      show(server({ version: '5.2.0', updateAvailable: false }, all));
      fireEvent.click(await screen.findByRole('button', { name: 'v5.2.0' }));
      const dialog = await screen.findByRole('dialog', { name: "What's new" });
      await within(dialog).findByText('change in 5.2.0');
      expect(within(dialog).getByText('change in 5.0.0')).toBeTruthy();
      expect(within(dialog).queryByText('change in 5.3.0')).toBeNull();
    });
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
    expect(image.getAttribute('src')).toContain('/api/v1/icons/mdi/plex.svg');
    fireEvent.error(image);
    await waitFor(() =>
      expect(container.querySelector('.tile-icon-fallback')?.textContent).toBe('P'),
    );
  });
});
