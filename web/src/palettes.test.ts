import { describe, expect, it } from 'vitest';
import { PALETTES, SCHEMES } from './palettes';

const channel = (value: number) => {
  const c = value / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};
const luminance = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return 0.2126 * channel(n >> 16) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
};
// The contrast ratio of WCAG, from 1 to 21.
const contrast = (a: string, b: string) => {
  const [low, high] = [luminance(a), luminance(b)].sort((x, y) => x - y);
  return (high! + 0.05) / (low! + 0.05);
};

describe('Colour schemes', () => {
  it('offers ten, each with a light and a dark palette', () => {
    expect(SCHEMES).toHaveLength(10);
    expect(Object.keys(PALETTES).sort()).toEqual([...SCHEMES].sort());
    for (const scheme of SCHEMES) {
      expect(luminance(PALETTES[scheme].light.bodyBgColor)).toBeGreaterThan(0.8);
      expect(luminance(PALETTES[scheme].dark.bodyBgColor)).toBeLessThan(0.05);
    }
  });

  it('are colours public/boot.js accepts', () => {
    for (const scheme of SCHEMES) {
      for (const mode of ['light', 'dark'] as const) {
        for (const color of Object.values(PALETTES[scheme][mode])) expect(color).toMatch(/^#[0-9A-F]{6}$/);
      }
    }
  });

  it('keep text readable on the background', () => {
    for (const scheme of SCHEMES) {
      for (const mode of ['light', 'dark'] as const) {
        const p = PALETTES[scheme][mode];
        const name = `${scheme} ${mode}`;
        expect(contrast(p.emphasisColor, p.bodyBgColor), `${name} text`).toBeGreaterThanOrEqual(7);
        expect(contrast(p.bodyColor, p.bodyBgColor), `${name} muted`).toBeGreaterThanOrEqual(4.5);
        expect(contrast(p.textPrimaryColor, p.bodyBgColor), `${name} primary`).toBeGreaterThanOrEqual(4.5);
        expect(contrast(p.textAccentColor, p.bodyBgColor), `${name} accent`).toBeGreaterThanOrEqual(4.5);
      }
    }
  });
});
