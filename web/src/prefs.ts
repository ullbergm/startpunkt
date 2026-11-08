import { signal } from '@preact/signals';

// Everything a visitor can change for themselves. It lives in this browser
// only and never reaches the server.

export type ThemeMode = 'auto' | 'light' | 'dark';
export type Spacing = 'tight' | 'normal' | 'relaxed';
export type BackgroundType = 'theme' | 'solid' | 'gradient' | 'image' | 'pictureOfDay';
export type Direction = 'to bottom' | 'to top' | 'to right' | 'to left' | 'to bottom right' | 'to bottom left';

export interface Preferences {
  theme: ThemeMode;
  // A language tag, or null to follow the browser and the server's default.
  language: string | null;
  // Tile ids. An id includes the cluster, so a favorite is one tile.
  favorites: string[];
  // Keys of collapsed groups, "<kind>:<group name>".
  collapsed: string[];
  layout: {
    // Number of columns, or 0 to fit as many as there is room for.
    columns: number;
    spacing: Spacing;
    compact: boolean;
    showDescription: boolean;
    showStatus: boolean;
    hideUnreachable: boolean;
  };
  background: {
    type: BackgroundType;
    color: string;
    color2: string;
    direction: Direction;
    imageUrl: string;
    blur: boolean;
    // A translucent panel behind the content, for busy backgrounds.
    overlay: boolean;
  };
  accessibility: {
    // Text size in percent of the browser's own.
    fontScale: number;
    highContrast: boolean;
  };
}

export const MAX_COLUMNS = 6;
export const FONT_SCALES = [85, 100, 115, 130, 150];
export const DIRECTIONS: Direction[] = [
  'to bottom',
  'to top',
  'to right',
  'to left',
  'to bottom right',
  'to bottom left',
];

export function defaults(): Preferences {
  return {
    theme: 'auto',
    language: null,
    favorites: [],
    collapsed: [],
    layout: {
      columns: 0,
      spacing: 'normal',
      compact: false,
      showDescription: true,
      showStatus: true,
      hideUnreachable: false,
    },
    background: {
      type: 'theme',
      color: '#214667',
      color2: '#7a4fa3',
      direction: 'to bottom right',
      imageUrl: '',
      blur: false,
      // On by default: headings sit straight on the background, and few
      // pictures leave them readable.
      overlay: true,
    },
    accessibility: { fontScale: 100, highContrast: false },
  };
}

const KEY = 'startpunkt.preferences';
const HEX = /^#[0-9a-fA-F]{6}$/;

const oneOf = <T,>(value: unknown, allowed: readonly T[], fallback: T): T =>
  allowed.includes(value as T) ? (value as T) : fallback;
const bool = (value: unknown, fallback: boolean): boolean =>
  typeof value === 'boolean' ? value : fallback;
const strings = (value: unknown): string[] =>
  Array.isArray(value) ? [...new Set(value.filter((v): v is string => typeof v === 'string'))] : [];
const hex = (value: unknown, fallback: string): string =>
  typeof value === 'string' && HEX.test(value) ? value : fallback;
const record = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === 'object' ? (value as Record<string, unknown>) : {};

// Turns whatever was stored into valid preferences. Stored data may come
// from an older version or have been edited by hand, so nothing is trusted:
// each value is checked and replaced by its default when it does not fit.
export function sanitize(raw: unknown): Preferences {
  const d = defaults();
  const r = record(raw);
  const layout = record(r.layout);
  const background = record(r.background);
  const accessibility = record(r.accessibility);
  const columns = layout.columns;
  return {
    theme: oneOf<ThemeMode>(r.theme, ['auto', 'light', 'dark'], d.theme),
    language: typeof r.language === 'string' && r.language !== '' ? r.language : null,
    favorites: strings(r.favorites),
    collapsed: strings(r.collapsed),
    layout: {
      columns:
        typeof columns === 'number' && Number.isInteger(columns) && columns >= 0 && columns <= MAX_COLUMNS
          ? columns
          : d.layout.columns,
      spacing: oneOf<Spacing>(layout.spacing, ['tight', 'normal', 'relaxed'], d.layout.spacing),
      compact: bool(layout.compact, d.layout.compact),
      showDescription: bool(layout.showDescription, d.layout.showDescription),
      showStatus: bool(layout.showStatus, d.layout.showStatus),
      hideUnreachable: bool(layout.hideUnreachable, d.layout.hideUnreachable),
    },
    background: {
      type: oneOf<BackgroundType>(
        background.type,
        ['theme', 'solid', 'gradient', 'image', 'pictureOfDay'],
        d.background.type,
      ),
      color: hex(background.color, d.background.color),
      color2: hex(background.color2, d.background.color2),
      direction: oneOf<Direction>(background.direction, DIRECTIONS, d.background.direction),
      imageUrl: typeof background.imageUrl === 'string' ? background.imageUrl.slice(0, 2000) : '',
      blur: bool(background.blur, d.background.blur),
      overlay: bool(background.overlay, d.background.overlay),
    },
    accessibility: {
      fontScale: oneOf(accessibility.fontScale, FONT_SCALES, d.accessibility.fontScale),
      highContrast: bool(accessibility.highContrast, d.accessibility.highContrast),
    },
  };
}

function read(): Preferences {
  try {
    const stored = window.localStorage.getItem(KEY);
    return stored ? sanitize(JSON.parse(stored)) : defaults();
  } catch {
    // Storage can be unavailable or hold something unreadable.
    return defaults();
  }
}

export const prefs = signal<Preferences>(read());

// Changes the preferences and stores them. The page works without storage;
// the change then lasts until the page is closed.
export function updatePrefs(change: (current: Preferences) => Preferences): void {
  const next = sanitize(change(prefs.value));
  prefs.value = next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Nothing to do.
  }
}

export function resetPrefs(): void {
  // Favorites and collapsed groups are content, not appearance. Keep them.
  updatePrefs((current) => ({ ...defaults(), favorites: current.favorites, collapsed: current.collapsed }));
}

export function toggleFavorite(ids: string[]): void {
  updatePrefs((current) => {
    const all = ids.every((id) => current.favorites.includes(id));
    const rest = current.favorites.filter((id) => !ids.includes(id));
    return { ...current, favorites: all ? rest : [...rest, ...ids] };
  });
}

export function toggleCollapsed(key: string): void {
  updatePrefs((current) => ({
    ...current,
    collapsed: current.collapsed.includes(key)
      ? current.collapsed.filter((other) => other !== key)
      : [...current.collapsed, key],
  }));
}

// For tests.
export function reloadPrefs(): void {
  prefs.value = read();
}
