import { signal } from '@preact/signals';

// Everything a visitor can change for themselves. It lives in this browser
// only and never reaches the server.

export type ThemeMode = 'auto' | 'light' | 'dark';
export type Spacing = 'tight' | 'normal' | 'relaxed';
export type BackgroundType =
  | 'theme'
  | 'solid'
  | 'gradient'
  | 'timeGradient'
  | 'meshGradient'
  | 'image'
  | 'pictureOfDay'
  | 'geopattern';
export type Complexity = 'low' | 'medium' | 'high';
export type Direction = 'to bottom' | 'to top' | 'to right' | 'to left' | 'to bottom right' | 'to bottom left';

export interface Preferences {
  theme: ThemeMode;
  // A language tag, or null to follow the browser and the server's default.
  language: string | null;
  // Tile ids, in the order the favorites are shown. An id includes the
  // cluster, so a favorite is one tile.
  favorites: string[];
  // Keys of collapsed groups, "<kind>:<group name>".
  collapsed: string[];
  layout: {
    // Number of columns, or 0 to fit as many as there is room for.
    columns: number;
    spacing: Spacing;
    compact: boolean;
    // A box around each tile. Without it tiles sit straight on the page.
    showBoxes: boolean;
    showDescription: boolean;
    showTags: boolean;
    showStatus: boolean;
    hideUnreachable: boolean;
  };
  background: Background;
  // A casual handwritten typeface for the whole page.
  handwrittenFont: boolean;
  // Named snapshots of the layout and the background.
  presets: Record<string, Preset>;
  accessibility: {
    // Text size in percent of the browser's own.
    fontScale: number;
    highContrast: boolean;
  };
}

export interface Background {
  type: BackgroundType;
  color: string;
  color2: string;
  direction: Direction;
  imageUrl: string;
  // Text the geopattern is generated from.
  patternSeed: string;
  meshColors: string[];
  meshComplexity: Complexity;
  meshAnimated: boolean;
  // Blur of a picture, in pixels.
  blur: number;
  // How much of the background shows, from 0.1 to 1.
  opacity: number;
  // How solid the panel behind the content is, from 0 (none) to 1. It
  // keeps text readable on a busy background.
  overlayOpacity: number;
  // Blur what shows through the panel, like frosted glass.
  overlayBlur: boolean;
}

export interface Preset {
  layout: Preferences['layout'];
  background: Background;
}

export const MAX_COLUMNS = 6;
export const MAX_BLUR = 20;
export const MESH_COLORS = 5;
export const MAX_PRESETS = 20;
// In the order they are offered. The first is the default.
export const TYPES: BackgroundType[] = [
  'pictureOfDay',
  'theme',
  'solid',
  'gradient',
  'timeGradient',
  'meshGradient',
  'image',
  'geopattern',
];
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
      showBoxes: false,
      showDescription: true,
      showTags: false,
      showStatus: true,
      hideUnreachable: false,
    },
    background: {
      type: 'pictureOfDay',
      color: '#214667',
      color2: '#7a4fa3',
      direction: 'to bottom right',
      imageUrl: '',
      patternSeed: 'startpunkt',
      meshColors: ['#2d5016', '#f4c430', '#00ffff', '#ff0080', '#800000'],
      meshComplexity: 'high',
      meshAnimated: false,
      blur: 0,
      opacity: 1,
      // Mostly solid by default: headings sit straight on the background,
      // and few pictures leave them readable.
      overlayOpacity: 0.85,
      overlayBlur: true,
    },
    handwrittenFont: false,
    presets: {},
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

const number = (value: unknown, min: number, max: number, fallback: number): number =>
  typeof value === 'number' && Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;

function sanitizeLayout(raw: unknown): Preferences['layout'] {
  const d = defaults().layout;
  const layout = record(raw);
  const columns = layout.columns;
  return {
    columns:
      typeof columns === 'number' && Number.isInteger(columns) && columns >= 0 && columns <= MAX_COLUMNS
        ? columns
        : d.columns,
    spacing: oneOf<Spacing>(layout.spacing, ['tight', 'normal', 'relaxed'], d.spacing),
    compact: bool(layout.compact, d.compact),
    showBoxes: bool(layout.showBoxes, d.showBoxes),
    showDescription: bool(layout.showDescription, d.showDescription),
    showTags: bool(layout.showTags, d.showTags),
    showStatus: bool(layout.showStatus, d.showStatus),
    hideUnreachable: bool(layout.hideUnreachable, d.hideUnreachable),
  };
}

function sanitizeBackground(raw: unknown): Background {
  const d = defaults().background;
  const background = record(raw);
  const mesh = Array.isArray(background.meshColors) ? background.meshColors : [];
  return {
    type: oneOf<BackgroundType>(background.type, TYPES, d.type),
    color: hex(background.color, d.color),
    color2: hex(background.color2, d.color2),
    direction: oneOf<Direction>(background.direction, DIRECTIONS, d.direction),
    imageUrl: typeof background.imageUrl === 'string' ? background.imageUrl.slice(0, 2000) : '',
    patternSeed: typeof background.patternSeed === 'string' ? background.patternSeed.slice(0, 100) : d.patternSeed,
    meshColors: d.meshColors.map((fallback, i) => hex(mesh[i], fallback)),
    meshComplexity: oneOf<Complexity>(background.meshComplexity, ['low', 'medium', 'high'], d.meshComplexity),
    meshAnimated: bool(background.meshAnimated, d.meshAnimated),
    // Earlier versions stored blur and the panel as on or off.
    blur: background.blur === true ? 10 : number(background.blur, 0, MAX_BLUR, d.blur),
    opacity: number(background.opacity, 0.1, 1, d.opacity),
    overlayOpacity:
      typeof background.overlay === 'boolean' && background.overlayOpacity === undefined
        ? background.overlay
          ? d.overlayOpacity
          : 0
        : number(background.overlayOpacity, 0, 1, d.overlayOpacity),
    overlayBlur: bool(background.overlayBlur, d.overlayBlur),
  };
}

function sanitizePresets(raw: unknown): Record<string, Preset> {
  const out: Record<string, Preset> = {};
  for (const [name, value] of Object.entries(record(raw)).slice(0, MAX_PRESETS)) {
    const trimmed = name.trim().slice(0, 40);
    if (trimmed === '') continue;
    const preset = record(value);
    out[trimmed] = { layout: sanitizeLayout(preset.layout), background: sanitizeBackground(preset.background) };
  }
  return out;
}

// Turns whatever was stored into valid preferences. Stored data may come
// from an older version or have been edited by hand, so nothing is trusted:
// each value is checked and replaced by its default when it does not fit.
export function sanitize(raw: unknown): Preferences {
  const d = defaults();
  const r = record(raw);
  const accessibility = record(r.accessibility);
  return {
    theme: oneOf<ThemeMode>(r.theme, ['auto', 'light', 'dark'], d.theme),
    language: typeof r.language === 'string' && r.language !== '' ? r.language : null,
    favorites: strings(r.favorites),
    collapsed: strings(r.collapsed),
    layout: sanitizeLayout(r.layout),
    background: sanitizeBackground(r.background),
    handwrittenFont: bool(r.handwrittenFont, d.handwrittenFont),
    presets: sanitizePresets(r.presets),
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
  // Favorites, collapsed groups and saved presets are content, not
  // appearance. Keep them.
  updatePrefs((current) => ({
    ...defaults(),
    favorites: current.favorites,
    collapsed: current.collapsed,
    presets: current.presets,
  }));
}

export function toggleFavorite(ids: string[]): void {
  updatePrefs((current) => {
    const all = ids.every((id) => current.favorites.includes(id));
    const rest = current.favorites.filter((id) => !ids.includes(id));
    return { ...current, favorites: all ? rest : [...rest, ...ids] };
  });
}

// Moves a favorite to the place of another one. The order of the list is
// the order the favorites are shown in.
export function moveFavorite(id: string, toIndex: number): void {
  updatePrefs((current) => {
    const from = current.favorites.indexOf(id);
    if (from < 0) return current;
    const rest = current.favorites.filter((other) => other !== id);
    const index = Math.min(Math.max(toIndex, 0), rest.length);
    return { ...current, favorites: [...rest.slice(0, index), id, ...rest.slice(index)] };
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

// Saves the current layout and background under a name, replacing a preset
// of the same name.
export function savePreset(name: string): void {
  const trimmed = name.trim();
  if (trimmed === '') return;
  updatePrefs((current) => ({
    ...current,
    presets: { ...current.presets, [trimmed]: { layout: current.layout, background: current.background } },
  }));
}

export function loadPreset(name: string): void {
  updatePrefs((current) => {
    const preset = current.presets[name];
    return preset ? { ...current, layout: preset.layout, background: preset.background } : current;
  });
}

export function deletePreset(name: string): void {
  updatePrefs((current) => {
    const { [name]: _removed, ...rest } = current.presets;
    return { ...current, presets: rest };
  });
}

// The name of the preset that matches the current layout and background, if
// there is one.
export function activePreset(p: Preferences): string | null {
  const now = JSON.stringify({ layout: p.layout, background: p.background });
  return Object.keys(p.presets).find((name) => JSON.stringify(p.presets[name]) === now) ?? null;
}

// For tests.
export function reloadPrefs(): void {
  prefs.value = read();
}
