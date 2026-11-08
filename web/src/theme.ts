import type { Preferences, ThemeMode } from './prefs';
import type { Palette } from './types';

export type Mode = 'light' | 'dark';

export function resolveMode(preference: ThemeMode, systemPrefersDark: boolean): Mode {
  if (preference === 'auto') return systemPrefersDark ? 'dark' : 'light';
  return preference;
}

export function systemPrefersDark(): boolean {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
}

// Applies the palette and the appearance preferences to the document.
//
// Colours are set as custom properties through the style API, never as
// style text, and the stylesheet derives everything else from them. The
// rest are attributes the stylesheet selects on.
export function applyAppearance(root: HTMLElement, mode: Mode, palette: Palette | undefined, p: Preferences): void {
  root.dataset.mode = mode;
  root.dataset.spacing = p.layout.spacing;
  root.dataset.compact = String(p.layout.compact);
  root.dataset.contrast = p.accessibility.highContrast ? 'high' : 'normal';
  root.dataset.background = p.background.type;
  root.dataset.overlay = String(p.background.overlay);
  root.style.setProperty('--columns', String(p.layout.columns));
  root.dataset.columns = p.layout.columns === 0 ? 'auto' : 'fixed';
  root.style.fontSize = `${p.accessibility.fontScale}%`;
  if (!palette) return;
  const colors: Record<string, string> = {
    '--bg': palette.bodyBgColor,
    '--muted': palette.bodyColor,
    '--text': palette.emphasisColor,
    '--primary': palette.textPrimaryColor,
    '--accent': palette.textAccentColor,
  };
  for (const [name, value] of Object.entries(colors)) {
    root.style.setProperty(name, value);
  }
}
