import { beforeEach, describe, expect, it } from 'vitest';
import { defaults, moveFavorite, prefs, reloadPrefs, resetPrefs, sanitize, toggleCollapsed, toggleFavorite, updatePrefs } from './prefs';

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
      layout: { columns: 3, spacing: 'huge', compact: true, hideUnreachable: 'yes' },
      background: { type: 'gradient', color: '#ABCDEF', color2: 'red', direction: 'sideways', imageUrl: 5 },
      accessibility: { fontScale: 115, highContrast: true },
      unknown: true,
    });
    expect(result.theme).toBe('dark');
    expect(result.language).toBe('sv-SE');
    expect(result.favorites).toEqual(['a', 'b']);
    expect(result.layout).toMatchObject({ columns: 3, spacing: 'normal', compact: true, hideUnreachable: false });
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
    toggleFavorite(['a', 'b']); // not all are favorites yet: add the rest
    expect(prefs.value.favorites.sort()).toEqual(['a', 'b']);
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
  });

  it('read what an earlier version stored', () => {
    const old = sanitize({ background: { type: 'image', blur: true, overlay: false } });
    expect(old.background).toMatchObject({ type: 'image', blur: 10, overlayOpacity: 0 });
    expect(sanitize({ background: { overlay: true } }).background.overlayOpacity).toBe(0.7);
  });

  it('keep presets valid whatever was stored', () => {
    const result = sanitize({
      presets: {
        ' Evening ': { layout: { columns: 3, spacing: 'nope' }, background: { type: 'meshGradient', meshColors: ['#111111', 'x'] } },
        '': { layout: {} },
        broken: 'not a preset',
      },
    });
    expect(Object.keys(result.presets).sort()).toEqual(['Evening', 'broken']);
    expect(result.presets.Evening?.layout).toMatchObject({ columns: 3, spacing: 'normal' });
    expect(result.presets.Evening?.background.meshColors[0]).toBe('#111111');
    expect(result.presets.Evening?.background.meshColors[1]).toBe(defaults().background.meshColors[1]);
    expect(result.presets.broken).toEqual({ layout: defaults().layout, background: defaults().background });
  });

  it('clamp numbers to their range', () => {
    const b = sanitize({ background: { blur: 500, opacity: 0, overlayOpacity: 7 } }).background;
    expect(b).toMatchObject({ blur: 20, opacity: 0.1, overlayOpacity: 1 });
    expect(sanitize({ background: { overlayOpacity: -7 } }).background.overlayOpacity).toBe(-1);
    expect(sanitize({ background: { overlayOpacity: -0.4 } }).background.overlayOpacity).toBe(-0.4);
  });
});
