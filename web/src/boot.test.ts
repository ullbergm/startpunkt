import { beforeEach, describe, expect, it } from 'vitest';
import { defaults } from './prefs';
import { APPEARANCE_KEY, applyAppearance } from './theme';
import bootSource from '../public/boot.js?raw';

// public/boot.js runs before the application, straight from a script tag.
const boot = new Function(bootSource);
const root = document.documentElement;

beforeEach(() => {
  window.localStorage.clear();
  root.removeAttribute('data-mode');
  root.removeAttribute('style');
});

describe('boot script', () => {
  it('starts dark on a first visit, which is the default look', () => {
    boot();
    expect(root.dataset.mode).toBe('dark');
  });

  it('applies what the application applied last', () => {
    const palette = {
      bodyBgColor: '#101820',
      bodyColor: '#808080',
      emphasisColor: '#FFFFFF',
      textPrimaryColor: '#EEEEEE',
      textAccentColor: '#FF8800',
    };
    applyAppearance(root, 'light', palette, defaults());
    root.removeAttribute('data-mode');
    root.removeAttribute('style');

    boot();
    expect(root.dataset.mode).toBe('light');
    expect(root.style.getPropertyValue('--bg')).toBe('#101820');
    expect(root.style.getPropertyValue('--accent')).toBe('#FF8800');
  });

  it('ignores stored values that are not colours it knows', () => {
    window.localStorage.setItem(
      APPEARANCE_KEY,
      JSON.stringify({
        mode: 'light',
        colors: { '--bg': 'url(https://evil.example/x)', '--other': '#000000', '--text': '#123456' },
      }),
    );
    boot();
    expect(root.style.getPropertyValue('--bg')).toBe('');
    expect(root.style.getPropertyValue('--other')).toBe('');
    expect(root.style.getPropertyValue('--text')).toBe('#123456');
  });

  it('falls back to the default when storage holds something else', () => {
    for (const junk of ['{not json', '"text"', '{"mode":"purple"}', 'null']) {
      window.localStorage.setItem(APPEARANCE_KEY, junk);
      root.removeAttribute('data-mode');
      boot();
      expect(root.dataset.mode).toBe('dark');
    }
  });
});
