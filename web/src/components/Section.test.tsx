import { cleanup, fireEvent, render } from '@testing-library/preact';
import { afterEach, beforeEach, expect, it } from 'vitest';
import { toCards } from '../cards';
import { setLanguage } from '../i18n';
import { reloadPrefs } from '../prefs';
import { tile } from '../testing';
import { Section } from './Section';

beforeEach(async () => {
  localStorage.clear();
  reloadPrefs();
  await setLanguage('en-US');
});
afterEach(cleanup);

it('gives colliding group names and separate sections unique stable ARIA targets', () => {
  const groups = ['home lab', 'home-lab', 'å home'].map((name) => ({ name, cards: toCards([tile({ name, group: name })], false, []) }));
  render(<><Section id="applications" title="First" groups={groups} iconColor="red" /><Section id="applications" title="Second" groups={groups} iconColor="red" /></>);
  const ids = [...document.querySelectorAll('[id]')].map((node) => node.id);
  expect(new Set(ids).size).toBe(ids.length);
  const buttons = [...document.querySelectorAll<HTMLButtonElement>('.group-toggle')];
  const targets = buttons.map((button) => button.getAttribute('aria-controls'));
  for (const target of targets) expect(document.getElementById(target!)).not.toBeNull();
  for (const region of document.querySelectorAll('[aria-labelledby]')) {
    expect(document.getElementById(region.getAttribute('aria-labelledby')!)).not.toBeNull();
  }
  fireEvent.click(buttons[0]!);
  expect(buttons[0]!.getAttribute('aria-controls')).toBe(targets[0]);
  expect(document.getElementById(targets[0]!)?.hidden).toBe(true);
});
