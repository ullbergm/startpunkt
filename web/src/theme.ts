import type { Preferences, ThemeMode } from './prefs';
import type { Palette } from './types';

export type Mode = 'light' | 'dark';

export function resolveMode(preference: ThemeMode, systemPrefersDark: boolean): Mode {
  if (preference === 'auto') return systemPrefersDark ? 'dark' : 'light';
  return preference;
}

// The panel behind the content decides the mode while there is one: text on
// a white panel has to be dark, and text on a black panel light, whatever
// the visitor's theme. Returns null when there is no panel.
export function panelMode(p: Preferences): Mode | null {
  const { type, overlayOpacity } = p.background;
  if (type === 'theme' || overlayOpacity === 0) return null;
  return overlayOpacity > 0 ? 'dark' : 'light';
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
  root.dataset.boxes = String(p.layout.showBoxes);
  root.dataset.hover = String(p.layout.hoverEffect);
  root.dataset.contrast = p.accessibility.highContrast ? 'high' : 'normal';
  root.dataset.background = p.background.type;
  const panel = panelMode(p);
  root.dataset.overlay = String(panel !== null);
  const shade = panel === 'light' ? '255 255 255' : '0 0 0';
  root.style.setProperty('--overlay', `rgb(${shade} / ${Math.round(Math.abs(p.background.overlayOpacity) * 100)}%)`);
  root.dataset.overlayBlur = String(p.background.overlayBlur > 0);
  root.style.setProperty('--overlay-blur', `${p.background.overlayBlur}px`);
  root.dataset.font = p.handwrittenFont ? 'handwritten' : 'default';
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
