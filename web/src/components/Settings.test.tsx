import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/preact';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setLanguage } from '../i18n';
import { defaults, prefs, reloadPrefs, toggleFavorite } from '../prefs';
import { Background, imageAddress } from './Background';
import { Settings } from './Settings';

beforeEach(async () => {
  window.localStorage.clear();
  reloadPrefs();
  await setLanguage('en-US');
});
afterEach(() => cleanup());

const select = (name: string, value: string) =>
  fireEvent.change(screen.getByRole('combobox', { name }), { target: { value } });

describe('Settings', () => {
  it('changes and stores preferences', () => {
    render(<Settings onClose={() => undefined} />);
    select('Theme', 'dark');
    select('Columns', '4');
    select('Spacing', 'relaxed');
    fireEvent.click(screen.getByRole('checkbox', { name: 'Compact tiles' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Hide unreachable applications' }));
    fireEvent.click(screen.getByRole('checkbox', { name: /High contrast/ }));

    expect(prefs.value.theme).toBe('dark');
    expect(prefs.value.layout).toMatchObject({ columns: 4, spacing: 'relaxed', compact: true, hideUnreachable: true });
    expect(prefs.value.accessibility.highContrast).toBe(true);
    reloadPrefs();
    expect(prefs.value.layout.columns).toBe(4);
  });

  it('steps the text size within its range', () => {
    render(<Settings onClose={() => undefined} />);
    const bigger = screen.getByRole('button', { name: 'Increase text size' });
    const smaller = screen.getByRole('button', { name: 'Decrease text size' });
    fireEvent.click(bigger);
    expect(prefs.value.accessibility.fontScale).toBe(115);
    fireEvent.click(smaller);
    fireEvent.click(smaller);
    expect(prefs.value.accessibility.fontScale).toBe(85);
    expect((smaller as HTMLButtonElement).disabled).toBe(true);
  });

  it('shows only the background options that apply', () => {
    render(<Settings onClose={() => undefined} />);
    expect(screen.queryByLabelText('Color')).toBeNull();
    expect(screen.queryByRole('checkbox', { name: /Panel behind the content/ })).toBeNull();

    select('Background type', 'gradient');
    expect(screen.getByLabelText('Color')).toBeTruthy();
    expect(screen.getByLabelText('Second color')).toBeTruthy();
    expect(screen.getByRole('combobox', { name: 'Direction' })).toBeTruthy();
    expect(screen.queryByRole('checkbox', { name: 'Blur the background' })).toBeNull();

    select('Background type', 'image');
    expect(screen.queryByLabelText('Second color')).toBeNull();
    fireEvent.change(screen.getByRole('textbox', { name: /Image URL/ }), {
      target: { value: 'https://example.com/a.jpg' },
    });
    expect(prefs.value.background.imageUrl).toBe('https://example.com/a.jpg');
    expect(screen.getByRole('checkbox', { name: 'Blur the background' })).toBeTruthy();
  });

  it('offers the languages by their own names', () => {
    render(<Settings onClose={() => undefined} />);
    const language = screen.getByRole('combobox', { name: 'Language' });
    expect([...language.querySelectorAll('option')].map((o) => o.textContent)).toEqual([
      'Browser default',
      'American English',
      'Svenska (Sverige)',
    ]);
    select('Language', 'sv-SE');
    expect(prefs.value.language).toBe('sv-SE');
    select('Language', '');
    expect(prefs.value.language).toBeNull();
  });

  it('resets appearance and keeps favorites', () => {
    toggleFavorite(['a']);
    render(<Settings onClose={() => undefined} />);
    select('Theme', 'dark');
    fireEvent.click(screen.getByRole('button', { name: 'Reset to defaults' }));
    expect(prefs.value).toEqual({ ...defaults(), favorites: ['a'] });
  });

  it('closes from its button', () => {
    const onClose = vi.fn();
    render(<Settings onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalled();
  });
});

describe('Background', () => {
  const base = defaults().background;

  it('draws nothing for the theme background', () => {
    const { container } = render(<Background background={base} />);
    expect(container.querySelector('.background')).toBeNull();
  });

  it('draws a solid colour and a gradient', () => {
    const solid = render(<Background background={{ ...base, type: 'solid', color: '#112233' }} />);
    expect((solid.container.querySelector('.background') as HTMLElement).style.backgroundColor).toBe('rgb(17, 34, 51)');
    cleanup();
    const gradient = render(<Background background={{ ...base, type: 'gradient' }} />);
    // The style API may reorder the direction keywords.
    expect((gradient.container.querySelector('.background') as HTMLElement).style.backgroundImage).toMatch(
      /^linear-gradient\(to (bottom right|right bottom), /,
    );
  });

  it('accepts only http and https images', () => {
    expect(imageAddress('https://example.com/a b.jpg')).toBe('https://example.com/a%20b.jpg');
    expect(imageAddress(' http://example.com/x ')).toBe('http://example.com/x');
    expect(imageAddress('javascript:alert(1)')).toBeNull();
    expect(imageAddress('data:image/png;base64,AAAA')).toBeNull();
    expect(imageAddress('not a url')).toBeNull();
    expect(imageAddress('https://example.com/")\;x')).not.toContain('"');

    const { container } = render(<Background background={{ ...base, type: 'image', imageUrl: 'javascript:alert(1)' }} />);
    expect(container.querySelector('.background')).toBeNull();
  });

  it('fetches the picture of the day and credits it', async () => {
    const fetcher = vi.fn(async () =>
      new Response(JSON.stringify({ url: 'https://www.bing.com/th?id=x.jpg', title: 'A view', copyright: 'Someone' })),
    );
    const { container } = render(
      <Background background={{ ...base, type: 'pictureOfDay', blur: true }} fetcher={fetcher as unknown as typeof fetch} />,
    );
    await waitFor(() => expect(container.querySelector('.background')).not.toBeNull());
    expect(fetcher).toHaveBeenCalledWith('/api/v1/background');
    expect(container.querySelector('.background')?.className).toContain('background-blur');
    expect(screen.getByText('Picture: A view (Someone)')).toBeTruthy();
  });

  it('draws nothing when the picture of the day is not available', async () => {
    const fetcher = vi.fn(async () => new Response('nope', { status: 502 }));
    const { container } = render(
      <Background background={{ ...base, type: 'pictureOfDay' }} fetcher={fetcher as unknown as typeof fetch} />,
    );
    await waitFor(() => expect(fetcher).toHaveBeenCalled());
    expect(container.querySelector('.background')).toBeNull();
  });
});
