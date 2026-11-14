import { beforeEach, describe, expect, it } from 'vitest';
import { clusterShown, defaults, moveFavorite, moveFavoriteCards, prefs, setClusterShown, setPanel, setTheme, showOnlyCluster, reloadPrefs, resetPrefs, sanitize, setServerDefaults, toggleCollapsed, toggleFavorite, updatePrefs } from './prefs';

beforeEach(() => {
  window.localStorage.clear();
  reloadPrefs();
});

describe('sanitize', () => {
  it('returns the defaults for anything that is not preferences', () => {
    for (const junk of [null, undefined, 'text', 42, [], { layout: 'x', background: 7 }]) {
      expect(sanitize(junk)).toEqual(defaults());
    }
  });

  it('keeps valid values and replaces invalid ones one by one', () => {
    const result = sanitize({
      theme: 'dark',
      language: 'sv-SE',
      favorites: ['a', 'a', 3, 'b'],
      layout: { columns: 3, spacing: 'huge', compact: true, showTags: true, hideUnreachable: 'yes' },
      background: { type: 'gradient', color: '#ABCDEF', color2: 'red', direction: 'sideways', imageUrl: 5 },
      accessibility: { fontScale: 115, highContrast: true },
      unknown: true,
    });
    expect(result.theme).toBe('dark');
    expect(result.colors).toBe('default');
    expect(sanitize({ colors: 'mint' }).colors).toBe('mint');
    expect(sanitize({ colors: 'plaid' }).colors).toBe('default');
    expect(result.language).toBe('sv-SE');
    expect(result.favorites).toEqual(['a', 'b']);
    expect(result.layout).toMatchObject({ columns: 3, showTags: true, hideUnreachable: false });
    // Spacing and compact tiles were settings once. What is stored of them is dropped.
    expect(result.layout).not.toHaveProperty('spacing');
    expect(result.layout).not.toHaveProperty('compact');
    expect(result.background).toMatchObject({
      type: 'gradient',
      color: '#ABCDEF',
      color2: defaults().background.color2,
      direction: defaults().background.direction,
      imageUrl: '',
    });
    expect(result.accessibility).toEqual({ fontScale: 115, highContrast: true });
    expect('unknown' in result).toBe(false);
  });

  it('rejects out-of-range numbers', () => {
    expect(sanitize({ layout: { columns: 99 } }).layout.columns).toBe(0);
    expect(sanitize({ layout: { columns: 2.5 } }).layout.columns).toBe(0);
    expect(sanitize({ accessibility: { fontScale: 1000 } }).accessibility.fontScale).toBe(100);
  });
});

describe('stored preferences', () => {
  it('survive a reload', () => {
    updatePrefs((p) => ({ ...p, theme: 'dark' }));
    toggleFavorite(['prod/apps/ns/grafana']);
    reloadPrefs();
    expect(prefs.value.theme).toBe('dark');
    expect(prefs.value.favorites).toEqual(['prod/apps/ns/grafana']);
  });

  it('fall back to the defaults when storage holds something unreadable', () => {
    window.localStorage.setItem('startpunkt.preferences', '{not json');
    reloadPrefs();
    expect(prefs.value).toEqual(defaults());
  });

  it('toggle a favorite on and off', () => {
    toggleFavorite(['a']);
    toggleFavorite(['b']);
    expect(prefs.value.favorites).toEqual(['a', 'b']);
    toggleFavorite(['a']);
    expect(prefs.value.favorites).toEqual(['b']);
  });

  it('treat a set of ids as one favorite', () => {
    toggleFavorite(['a']);
    toggleFavorite(['a', 'b']); // the combined card is already starred
    expect(prefs.value.favorites).toEqual([]);
    toggleFavorite(['a', 'b']);
    expect(prefs.value.favorites).toEqual(['a', 'b']);
    toggleFavorite(['a', 'b']);
    expect(prefs.value.favorites).toEqual([]);
  });

  it('move a favorite to another place', () => {
    for (const id of ['a', 'b', 'c', 'd']) toggleFavorite([id]);
    moveFavorite('d', 0);
    expect(prefs.value.favorites).toEqual(['d', 'a', 'b', 'c']);
    moveFavorite('d', 2);
    expect(prefs.value.favorites).toEqual(['a', 'b', 'd', 'c']);
    moveFavorite('a', 99);
    expect(prefs.value.favorites).toEqual(['b', 'd', 'c', 'a']);
    moveFavorite('unknown', 0);
    expect(prefs.value.favorites).toEqual(['b', 'd', 'c', 'a']);
  });

  it('moves every member of a card while hidden favorite slots stay unchanged', () => {
    updatePrefs((p) => ({ ...p, favorites: ['hidden-before', 'a-local', 'hidden-middle', 'a-remote', 'b', 'hidden-after'] }));
    moveFavoriteCards([['a-local', 'a-remote'], ['b']], 0, 1);
    expect(prefs.value.favorites).toEqual(['hidden-before', 'b', 'hidden-middle', 'a-local', 'a-remote', 'hidden-after']);
    moveFavoriteCards([['b'], ['a-local', 'a-remote']], 1, 0);
    expect(prefs.value.favorites).toEqual(['hidden-before', 'a-local', 'hidden-middle', 'a-remote', 'b', 'hidden-after']);
    moveFavoriteCards([['a-local', 'a-remote'], ['b']], 0, 2);
    expect(prefs.value.favorites).toEqual(['hidden-before', 'a-local', 'hidden-middle', 'a-remote', 'b', 'hidden-after']);
  });

  it('keep the theme and the panel in agreement', () => {
    // The default: a black panel on the picture of the day, theme on auto.
    expect(prefs.value.background.overlayOpacity).toBe(0.7);

    setTheme('light'); // the panel turns white, as strong as it was
    expect(prefs.value).toMatchObject({ theme: 'light', background: { overlayOpacity: -0.7 } });
    setTheme('dark');
    expect(prefs.value).toMatchObject({ theme: 'dark', background: { overlayOpacity: 0.7 } });

    setPanel(-0.4); // moving the panel to white switches to the light theme
    expect(prefs.value).toMatchObject({ theme: 'light', background: { overlayOpacity: -0.4 } });
    setPanel(0.2);
    expect(prefs.value.theme).toBe('dark');

    setPanel(0); // no panel: the theme stays as it was
    expect(prefs.value).toMatchObject({ theme: 'dark', background: { overlayOpacity: 0 } });
    setTheme('light'); // and with no panel there is nothing to turn
    expect(prefs.value).toMatchObject({ theme: 'light', background: { overlayOpacity: 0 } });

    setPanel(0.5);
    setTheme('auto'); // auto keeps the stored panel; its rendered colour follows the system
    expect(prefs.value).toMatchObject({ theme: 'auto', background: { overlayOpacity: 0.5 } });
    setPanel(-0.5);
    expect(prefs.value.theme).toBe('auto');
  });

  it('show one cluster alone, and all again on a second pick', () => {
    const all = ['local', 'dev', 'prod'];
    updatePrefs((p) => ({ ...p, hiddenClusters: ['gone'] })); // a cluster that is not listed any more
    showOnlyCluster('dev', all, all);
    expect(prefs.value.hiddenClusters.sort()).toEqual(['gone', 'local', 'prod']);
    expect(prefs.value.shownClusters).toEqual(['dev']);
    showOnlyCluster('prod', all, ['dev']);
    expect(prefs.value.hiddenClusters.sort()).toEqual(['dev', 'gone', 'local']);
    expect(prefs.value.shownClusters).toEqual(['prod']);
    // Picking the only one shown brings all of them back.
    showOnlyCluster('prod', all, ['prod']);
    expect(prefs.value.hiddenClusters).toEqual(['gone']);
    expect(prefs.value.shownClusters.sort()).toEqual(['dev', 'local', 'prod']);
  });

  it('show the local cluster by default, and others only when chosen or when the instance says so', () => {
    const local = { name: 'home', local: true };
    const remote = { name: 'prod', local: false };
    const none = { hiddenClusters: [], shownClusters: [] };
    expect(clusterShown(none, local, false)).toBe(true);
    expect(clusterShown(none, remote, false)).toBe(false);
    expect(clusterShown(none, remote, true)).toBe(true);
    // The visitor's own choice wins either way.
    expect(clusterShown({ hiddenClusters: [], shownClusters: ['prod'] }, remote, false)).toBe(true);
    expect(clusterShown({ hiddenClusters: ['prod'], shownClusters: [] }, remote, true)).toBe(false);
    expect(clusterShown({ hiddenClusters: ['home'], shownClusters: [] }, local, false)).toBe(false);

    setClusterShown('prod', true);
    expect(prefs.value).toMatchObject({ shownClusters: ['prod'], hiddenClusters: [] });
    setClusterShown('prod', false);
    expect(prefs.value).toMatchObject({ shownClusters: [], hiddenClusters: ['prod'] });
  });

  it('toggle a collapsed group', () => {
    toggleCollapsed('application:media');
    expect(prefs.value.collapsed).toEqual(['application:media']);
    toggleCollapsed('application:media');
    expect(prefs.value.collapsed).toEqual([]);
  });

  it('reset appearance but keep favorites and collapsed groups', () => {
    updatePrefs((p) => ({ ...p, theme: 'dark', layout: { ...p.layout, columns: 4 } }));
    toggleFavorite(['a']);
    toggleCollapsed('bookmark:links');
    resetPrefs();
    expect(prefs.value).toEqual({ ...defaults(), favorites: ['a'], collapsed: ['bookmark:links'] });
    setClusterShown('prod', false);
    setClusterShown('prod', false);
    expect(prefs.value.hiddenClusters).toEqual(['prod']);
    resetPrefs();
    expect(prefs.value.hiddenClusters).toEqual(['prod']); // a choice of content, kept
    setClusterShown('prod', true);
    expect(prefs.value.hiddenClusters).toEqual([]);
  });

  it('read what an earlier version stored', () => {
    const old = sanitize({ background: { type: 'image', blur: true, overlay: false } });
    expect(old.background).toMatchObject({ type: 'image', blur: 10, overlayOpacity: 0 });
    expect(sanitize({ background: { overlay: true } }).background.overlayOpacity).toBe(0.7);
  });

  it('keep presets valid whatever was stored', () => {
    const result = sanitize({
      presets: {
        ' Evening ': { layout: { columns: 3, showTags: 'nope' }, background: { type: 'meshGradient', meshColors: ['#111111', 'x'] } },
        '': { layout: {} },
        broken: 'not a preset',
      },
    });
    expect(Object.keys(result.presets).sort()).toEqual(['Evening', 'broken']);
    expect(result.presets.Evening?.layout).toMatchObject({ columns: 3, showTags: false });
    expect(result.presets.Evening?.background.meshColors[0]).toBe('#111111');
    expect(result.presets.Evening?.background.meshColors[1]).toBe(defaults().background.meshColors[1]);
    expect(result.presets.broken).toEqual({ layout: defaults().layout, background: defaults().background });
  });

  it('clamp numbers to their range', () => {
    const b = sanitize({ background: { blur: 500, opacity: 0, overlayOpacity: 7 } }).background;
    expect(b).toMatchObject({ blur: 20, opacity: 0.1, overlayOpacity: 1 });
    expect(sanitize({ background: { overlayOpacity: -7 } }).background.overlayOpacity).toBe(-1);
    expect(sanitize({ background: { overlayBlur: 99 } }).background.overlayBlur).toBe(30);
    // Stored as on or off by an earlier version.
    expect(sanitize({ background: { overlayBlur: true } }).background.overlayBlur).toBe(3);
    expect(sanitize({ background: { overlayBlur: false } }).background.overlayBlur).toBe(0);
    expect(sanitize({ background: { overlayOpacity: -0.4 } }).background.overlayOpacity).toBe(-0.4);
  });
});

describe('the defaults of the instance', () => {
  const server = { theme: 'dark', colors: 'ocean', layout: { columns: 4, showTags: true }, background: { type: 'gradient', blur: 'a lot' } };

  it('are what a browser without preferences starts from, and follows', () => {
    reloadPrefs();
    expect(prefs.value.theme).toBe('auto');
    setServerDefaults(server);
    expect(prefs.value).toMatchObject({ theme: 'dark', colors: 'ocean' });
    expect(prefs.value.layout).toMatchObject({ columns: 4, showTags: true });
    // What is left out, or does not fit, is the page's own default.
    expect(prefs.value.layout.showDescription).toBe(defaults().layout.showDescription);
    expect(prefs.value.background.type).toBe('gradient');
    expect(prefs.value.background.blur).toBe(defaults().background.blur);
    // Nothing was stored by that: the browser still has none of its own.
    expect(window.localStorage.getItem('startpunkt.preferences')).toBeNull();
    setServerDefaults({ ...server, theme: 'light' });
    expect(prefs.value.theme).toBe('light');
    // Without any, the page's own again.
    setServerDefaults(undefined);
    expect(prefs.value.theme).toBe('auto');
  });

  it('leave a browser alone that has preferences of its own', () => {
    reloadPrefs();
    updatePrefs((p) => ({ ...p, theme: 'light' }));
    setServerDefaults(server);
    expect(prefs.value.theme).toBe('light');
    expect(prefs.value.layout.columns).toBe(defaults().layout.columns);
  });

  it('are what a reset goes back to, keeping what is content', () => {
    reloadPrefs();
    updatePrefs((p) => ({ ...p, theme: 'light', favorites: ['a'], layout: { ...p.layout, columns: 2 } }));
    setServerDefaults({ ...server, favorites: ['from the server'] });
    resetPrefs();
    expect(prefs.value).toMatchObject({ theme: 'dark', colors: 'ocean', favorites: ['a'] });
    expect(prefs.value.layout.columns).toBe(4);
  });

  it('are not trusted', () => {
    reloadPrefs();
    for (const odd of ['dark', 7, ['x'], { theme: 'neon', layout: 'wide', accessibility: { fontScale: 9000 } }]) {
      setServerDefaults(odd);
      expect(prefs.value).toEqual(defaults());
    }
  });
});
