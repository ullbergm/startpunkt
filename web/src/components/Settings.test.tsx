import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/preact';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setLanguage } from '../i18n';
import { defaults, prefs, reloadPrefs, toggleFavorite } from '../prefs';
import { Background, imageAddress, meshGradient, timeGradient } from './Background';
import { Settings } from './Settings';

beforeEach(async () => {
  window.localStorage.clear();
  reloadPrefs();
  await setLanguage('en-US');
});
afterEach(() => cleanup());

const select = (name: string, value: string) =>
  fireEvent.change(screen.getByRole('combobox', { name }), { target: { value } });
const openTab = (name: string) => fireEvent.click(screen.getByRole('tab', { name }));
const slide = (name: RegExp | string, value: number) =>
  fireEvent.input(screen.getByRole('slider', { name }), { target: { value: String(value) } });

function open(tab?: string) {
  const onClose = vi.fn();
  render(<Settings onClose={onClose} />);
  if (tab) openTab(tab);
  return onClose;
}

describe('Settings tabs', () => {
  it('shows one section at a time, starting with appearance', () => {
    open();
    const tabs = screen.getAllByRole('tab');
    expect(tabs.map((tab) => tab.textContent)).toEqual(['Appearance', 'Layout', 'Background', 'Accessibility']);
    expect(tabs[0]!.getAttribute('aria-selected')).toBe('true');
    expect(screen.getByRole('tabpanel', { name: 'Appearance' })).toBeTruthy();
    expect(screen.getByRole('combobox', { name: 'Theme' })).toBeTruthy();
    expect(screen.queryByRole('combobox', { name: 'Columns' })).toBeNull();

    openTab('Layout');
    expect(screen.getByRole('tabpanel', { name: 'Layout' })).toBeTruthy();
    expect(screen.getByRole('combobox', { name: 'Columns' })).toBeTruthy();
    expect(screen.queryByRole('combobox', { name: 'Theme' })).toBeNull();
  });

  it('moves between tabs with the arrow keys, Home and End', () => {
    open();
    const list = screen.getByRole('tablist');
    const selected = () => screen.getAllByRole('tab').find((tab) => tab.getAttribute('aria-selected') === 'true');
    fireEvent.keyDown(list, { key: 'ArrowRight' });
    expect(selected()?.textContent).toBe('Layout');
    expect(document.activeElement).toBe(selected());
    fireEvent.keyDown(list, { key: 'ArrowLeft' });
    fireEvent.keyDown(list, { key: 'ArrowLeft' });
    expect(selected()?.textContent).toBe('Accessibility');
    fireEvent.keyDown(list, { key: 'Home' });
    expect(selected()?.textContent).toBe('Appearance');
    fireEvent.keyDown(list, { key: 'End' });
    expect(selected()?.textContent).toBe('Accessibility');
    // Only the selected tab is a Tab stop.
    expect(screen.getAllByRole('tab').map((tab) => tab.tabIndex)).toEqual([-1, -1, -1, 0]);
  });
});

describe('Settings', () => {
  it('changes and stores appearance', () => {
    open();
    select('Theme', 'dark');
    fireEvent.click(screen.getByRole('checkbox', { name: /Handwritten font/ }));
    expect(prefs.value.theme).toBe('dark');
    expect(prefs.value.handwrittenFont).toBe(true);
    reloadPrefs();
    expect(prefs.value.handwrittenFont).toBe(true);
  });

  it('changes and stores the layout', () => {
    open('Layout');
    select('Columns', '4');
    select('Spacing', 'relaxed');
    fireEvent.click(screen.getByRole('checkbox', { name: 'Compact tiles' }));
    const boxes = screen.getByRole('checkbox', { name: 'Box around each tile' }) as HTMLInputElement;
    expect(boxes.checked).toBe(false);
    fireEvent.click(boxes);
    fireEvent.click(screen.getByRole('checkbox', { name: 'Show tags' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Hide unreachable applications' }));
    expect(prefs.value.layout).toMatchObject({
      columns: 4,
      spacing: 'relaxed',
      compact: true,
      showBoxes: true,
      showTags: true,
      hideUnreachable: true,
    });
    reloadPrefs();
    expect(prefs.value.layout.columns).toBe(4);
  });

  it('steps the text size within its range', () => {
    open('Accessibility');
    const bigger = screen.getByRole('button', { name: 'Increase text size' });
    const smaller = screen.getByRole('button', { name: 'Decrease text size' });
    fireEvent.click(bigger);
    expect(prefs.value.accessibility.fontScale).toBe(115);
    fireEvent.click(smaller);
    fireEvent.click(smaller);
    expect(prefs.value.accessibility.fontScale).toBe(85);
    expect((smaller as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole('checkbox', { name: /High contrast/ }));
    expect(prefs.value.accessibility.highContrast).toBe(true);
  });

  it('offers the languages by their own names', () => {
    open();
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

  it('resets appearance and keeps favorites and presets', () => {
    toggleFavorite(['a']);
    open('Layout');
    select('Columns', '2');
    fireEvent.input(screen.getByRole('textbox', { name: 'Preset name' }), { target: { value: 'Two' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save current as preset' }));
    fireEvent.click(screen.getByRole('button', { name: 'Reset to defaults' }));
    expect(prefs.value.layout).toEqual(defaults().layout);
    expect(prefs.value.favorites).toEqual(['a']);
    expect(Object.keys(prefs.value.presets)).toEqual(['Two']);
  });

  it('closes from its button', () => {
    const onClose = open();
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalled();
  });
});

describe('Background settings', () => {
  it('shows only the options that apply to the chosen type', () => {
    open('Background');
    // The picture of the day is the default and comes first.
    expect((screen.getByRole('combobox', { name: 'Background type' }) as HTMLSelectElement).value).toBe('pictureOfDay');
    select('Background type', 'theme');
    expect(screen.queryByLabelText('Color')).toBeNull();
    expect(screen.queryByRole('slider')).toBeNull();
    expect(
      [...screen.getByRole('combobox', { name: 'Background type' }).querySelectorAll('option')].map((o) => o.textContent),
    ).toEqual([
      'Picture of the day',
      'Theme',
      'Solid color',
      'Gradient',
      'Time of day',
      'Mesh gradient',
      'Custom image',
      'Geopattern',
    ]);

    select('Background type', 'gradient');
    expect(screen.getByLabelText('Color')).toBeTruthy();
    expect(screen.getByLabelText('Second color')).toBeTruthy();
    expect(screen.getByRole('combobox', { name: 'Direction' })).toBeTruthy();
    expect(screen.queryByRole('slider', { name: 'Blur' })).toBeNull();
    expect(screen.getByRole('slider', { name: 'Opacity' })).toBeTruthy();

    select('Background type', 'image');
    expect(screen.queryByLabelText('Second color')).toBeNull();
    fireEvent.change(screen.getByRole('textbox', { name: /Image URL/ }), {
      target: { value: 'https://example.com/a.jpg' },
    });
    expect(prefs.value.background.imageUrl).toBe('https://example.com/a.jpg');
    expect(screen.getByRole('slider', { name: 'Blur' })).toBeTruthy();

    select('Background type', 'timeGradient');
    expect(screen.getByText(/follows the day/)).toBeTruthy();
  });

  it('sets blur, opacity and the panel with sliders that say their value', () => {
    open('Background');
    select('Background type', 'pictureOfDay');
    slide('Blur', 8);
    slide('Opacity', 0.5);
    const frosted = screen.getByRole('checkbox', { name: 'Blur the background behind the panel' }) as HTMLInputElement;
    expect(frosted.checked).toBe(true);
    fireEvent.click(frosted);
    expect(prefs.value.background.overlayBlur).toBe(false);
    slide(/Panel behind the content/, 0);
    expect(prefs.value.background).toMatchObject({ blur: 8, opacity: 0.5, overlayOpacity: 0 });
    // Without a panel there is nothing to blur behind.
    expect(screen.queryByRole('checkbox', { name: 'Blur the background behind the panel' })).toBeNull();
    expect(screen.getByRole('slider', { name: 'Blur' }).getAttribute('aria-valuetext')).toBe('8px');
    expect(screen.getByRole('slider', { name: 'Opacity' }).getAttribute('aria-valuetext')).toBe('50%');
    // The panel runs from white through none to black.
    const panelText = () => screen.getByRole('slider', { name: /Panel behind the content/ }).getAttribute('aria-valuetext');
    expect(panelText()).toBe('Off');
    slide(/Panel behind the content/, -0.4);
    expect(panelText()).toBe('White 40%');
    slide(/Panel behind the content/, 0.7);
    expect(panelText()).toBe('Black 70%');
    expect(prefs.value.background.overlayOpacity).toBe(0.7);
    expect(screen.getByRole('checkbox', { name: 'Blur the background behind the panel' })).toBeTruthy();
  });

  it('edits the mesh gradient', () => {
    open('Background');
    select('Background type', 'meshGradient');
    expect(screen.getAllByLabelText(/Mesh color \d/)).toHaveLength(5);
    fireEvent.input(screen.getByLabelText('Mesh color 2'), { target: { value: '#123456' } });
    select('Complexity', 'low');
    fireEvent.click(screen.getByRole('checkbox', { name: /Animate the mesh/ }));
    expect(prefs.value.background.meshColors[1]).toBe('#123456');
    expect(prefs.value.background.meshColors[0]).toBe(defaults().background.meshColors[0]);
    expect(prefs.value.background).toMatchObject({ meshComplexity: 'low', meshAnimated: true });
  });

  it('edits the geopattern', () => {
    open('Background');
    select('Background type', 'geopattern');
    fireEvent.input(screen.getByRole('textbox', { name: /Pattern text/ }), { target: { value: 'home lab' } });
    fireEvent.input(screen.getByLabelText('Pattern color'), { target: { value: '#335577' } });
    expect(prefs.value.background).toMatchObject({ patternSeed: 'home lab', color: '#335577' });
  });
});

describe('Layout presets', () => {
  it('saves, applies and deletes a preset of layout and background', () => {
    open('Layout');
    expect(screen.getByText('No presets saved yet.')).toBeTruthy();
    const save = screen.getByRole('button', { name: 'Save current as preset' }) as HTMLButtonElement;
    expect(save.disabled).toBe(true);

    select('Columns', '3');
    openTab('Background');
    select('Background type', 'timeGradient');
    openTab('Layout');
    fireEvent.input(screen.getByRole('textbox', { name: 'Preset name' }), { target: { value: ' Evening ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save current as preset' }));

    const use = screen.getByRole('button', { name: 'Use preset Evening' });
    expect(use.getAttribute('aria-pressed')).toBe('true');
    expect((screen.getByRole('textbox', { name: 'Preset name' }) as HTMLInputElement).value).toBe('');

    // Change away from it, then come back with one click.
    select('Columns', '5');
    expect(use.getAttribute('aria-pressed')).toBe('false');
    openTab('Background');
    select('Background type', 'solid');
    openTab('Layout');
    fireEvent.click(screen.getByRole('button', { name: 'Use preset Evening' }));
    expect(prefs.value.layout.columns).toBe(3);
    expect(prefs.value.background.type).toBe('timeGradient');

    reloadPrefs();
    expect(Object.keys(prefs.value.presets)).toEqual(['Evening']);

    fireEvent.click(screen.getByRole('button', { name: 'Delete preset Evening' }));
    expect(prefs.value.presets).toEqual({});
    expect(prefs.value.layout.columns).toBe(3);
  });

  it('saves with Enter and replaces a preset of the same name', () => {
    open('Layout');
    const name = screen.getByRole('textbox', { name: 'Preset name' });
    fireEvent.input(name, { target: { value: 'Mine' } });
    fireEvent.keyDown(name, { key: 'Enter' });
    select('Columns', '2');
    fireEvent.input(name, { target: { value: 'Mine' } });
    fireEvent.keyDown(name, { key: 'Enter' });
    expect(Object.keys(prefs.value.presets)).toEqual(['Mine']);
    expect(prefs.value.presets.Mine?.layout.columns).toBe(2);
  });
});

describe('Background', () => {
  const base = defaults().background;
  const element = (container: Element) => container.querySelector('.background') as HTMLElement | null;

  it('draws nothing for the theme background', () => {
    const { container } = render(<Background background={{ ...base, type: 'theme' }} />);
    expect(element(container)).toBeNull();
  });

  it('draws a solid colour and a gradient', () => {
    const solid = render(<Background background={{ ...base, type: 'solid', color: '#112233' }} />);
    expect(element(solid.container)!.style.backgroundColor).toBe('rgb(17, 34, 51)');
    cleanup();
    const gradient = render(<Background background={{ ...base, type: 'gradient' }} />);
    // The style API may reorder the direction keywords.
    expect(element(gradient.container)!.style.backgroundImage).toMatch(
      /^linear-gradient\(to (bottom right|right bottom), /,
    );
  });

  it('follows the time of day', () => {
    const at = (hour: number) => timeGradient(new Date(2026, 0, 1, hour, 30));
    expect(at(3)).toBe(at(22));
    expect(new Set([at(3), at(7), at(10), at(14), at(18)]).size).toBe(5);
    const { container } = render(
      <Background background={{ ...base, type: 'timeGradient' }} now={() => new Date(2026, 0, 1, 14, 0)} />,
    );
    expect(element(container)!.style.backgroundImage).toContain('linear-gradient(90deg');
  });

  it('draws a mesh whose complexity sets how many colours are used', () => {
    const colors = base.meshColors;
    expect(meshGradient(colors, 'low').split('radial-gradient')).toHaveLength(4);
    expect(meshGradient(colors, 'high').split('radial-gradient')).toHaveLength(6);
    const still = render(<Background background={{ ...base, type: 'meshGradient' }} />);
    expect(element(still.container)!.className).toBe('background');
    cleanup();
    const moving = render(<Background background={{ ...base, type: 'meshGradient', meshAnimated: true }} />);
    expect(element(moving.container)!.className).toContain('background-animated');
  });

  it('draws a pattern that depends on its text', () => {
    const image = (seed: string) => {
      const { container } = render(<Background background={{ ...base, type: 'geopattern', patternSeed: seed }} />);
      const value = element(container)!.style.backgroundImage;
      cleanup();
      return value;
    };
    expect(image('one')).toContain('data:image/svg+xml');
    expect(image('one')).toBe(image('one'));
    expect(image('one')).not.toBe(image('two'));
  });

  it('accepts only http and https images', () => {
    expect(imageAddress('https://example.com/a b.jpg')).toBe('https://example.com/a%20b.jpg');
    expect(imageAddress(' http://example.com/x ')).toBe('http://example.com/x');
    expect(imageAddress('javascript:alert(1)')).toBeNull();
    expect(imageAddress('data:image/png;base64,AAAA')).toBeNull();
    expect(imageAddress('not a url')).toBeNull();
    expect(imageAddress('https://example.com/")\;x')).not.toContain('"');

    const { container } = render(<Background background={{ ...base, type: 'image', imageUrl: 'javascript:alert(1)' }} />);
    expect(element(container)).toBeNull();
  });

  it('applies blur to pictures and opacity to everything', () => {
    const picture = render(
      <Background background={{ ...base, type: 'image', imageUrl: 'https://example.com/a.jpg', blur: 6, opacity: 0.4 }} />,
    );
    expect(element(picture.container)!.style.filter).toBe('blur(6px)');
    expect(element(picture.container)!.style.opacity).toBe('0.4');
    cleanup();
    const solid = render(<Background background={{ ...base, type: 'solid', blur: 6 }} />);
    expect(element(solid.container)!.style.filter).toBe('');
  });

  it('fetches the Bing picture of the day and credits it', async () => {
    const fetcher = vi.fn(async () =>
      new Response(JSON.stringify({ url: 'https://www.bing.com/th?id=x.jpg', title: 'A view', copyright: 'Someone' })),
    );
    const { container } = render(
      <Background background={{ ...base, type: 'pictureOfDay' }} fetcher={fetcher as unknown as typeof fetch} />,
    );
    await waitFor(() => expect(element(container)).not.toBeNull());
    // The size of the screen goes along, so the server can pick a picture.
    expect(fetcher).toHaveBeenCalledWith(`/api/v1/background?width=${window.screen.width}&height=${window.screen.height}`);
    expect(screen.getByText('Picture: A view (Someone)')).toBeTruthy();
  });

  it('draws nothing when the picture of the day is not available', async () => {
    const fetcher = vi.fn(async () => new Response('nope', { status: 502 }));
    const { container } = render(
      <Background background={{ ...base, type: 'pictureOfDay' }} fetcher={fetcher as unknown as typeof fetch} />,
    );
    await waitFor(() => expect(fetcher).toHaveBeenCalled());
    expect(element(container)).toBeNull();
  });
});
