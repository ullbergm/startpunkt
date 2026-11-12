import { afterEach, describe, expect, it } from 'vitest';
import english from './locales/en-US.json';
import swedish from './locales/sv-SE.json';
import { chooseLanguage, language, languages, setLanguage, t } from './i18n';

afterEach(() => setLanguage('en-US'));

describe('translations', () => {
  it('have the same keys and placeholders in every language', () => {
    const placeholders = (text: string) => (text.match(/\{\w+\}/g) ?? []).sort();
    expect(Object.keys(swedish).sort()).toEqual(Object.keys(english).sort());
    for (const key of Object.keys(english) as (keyof typeof english)[]) {
      expect(placeholders(swedish[key]), key).toEqual(placeholders(english[key]));
      expect(swedish[key].trim(), key).not.toBe('');
    }
  });

  it('lists the languages there are files for', () => {
    expect(languages).toEqual(['en-US', 'sv-SE']);
  });
});

describe('t', () => {
  it('fills placeholders and leaves unknown ones alone', () => {
    expect(t('tile.addFavorite', { name: 'Plex' })).toBe('Add Plex to favorites');
    expect(t('tile.addFavorite')).toBe('Add {name} to favorites');
  });

  it('follows the chosen language', async () => {
    await setLanguage('sv-SE');
    expect(language.value).toBe('sv-SE');
    expect(t('section.bookmarks')).toBe('Bokmärken');
    expect(document.documentElement.lang).toBe('sv-SE');
    await setLanguage('en-US');
    expect(t('section.bookmarks')).toBe('Bookmarks');
  });

  it('keeps the last choice when two are made in a row', async () => {
    const first = setLanguage('sv-SE');
    const second = setLanguage('en-US');
    await Promise.all([first, second]);
    expect(language.value).toBe('en-US');
  });
});

describe('chooseLanguage', () => {
  const available = ['en-US', 'sv-SE'];
  it('prefers the visitor, then the browser, then the server', () => {
    expect(chooseLanguage('sv-SE', ['en-US'], 'en-US', available)).toBe('sv-SE');
    expect(chooseLanguage(null, ['de-DE', 'sv'], 'en-US', available)).toBe('sv-SE');
    expect(chooseLanguage(null, ['de-DE'], 'sv-SE', available)).toBe('sv-SE');
    expect(chooseLanguage(null, [], 'fi-FI', available)).toBe('en-US');
  });
  it('ignores a stored choice that is no longer available', () => {
    expect(chooseLanguage('xx-XX', ['sv-SE'], 'en-US', available)).toBe('sv-SE');
  });
  it('matches by language when the region differs', () => {
    expect(chooseLanguage(null, ['en-GB'], 'sv-SE', available)).toBe('en-US');
  });
});
