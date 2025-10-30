import { h } from 'preact';
import { render, screen, fireEvent, waitFor } from '@testing-library/preact';
import { ThemeApplier } from './app';

jest.mock('@rehooks/local-storage', () => ({
  useLocalStorage: (key, initial) => [global._mockTheme || initial, jest.fn()],
  writeStorage: jest.fn(),
}));

jest.mock('react-responsive', () => ({
  useMediaQuery: () => global._mockSystemPrefersDark || false,
}));

jest.mock('@version-checker/browser', () => ({
  __esModule: true,
  default: jest.fn(() => Promise.resolve({})),
}));

jest.mock('./useBackgroundPreferences', () => ({
  useBackgroundPreferences: () => ({
    preferences: { type: global._mockBackgroundType || 'theme' }
  })
}));

beforeEach(() => {
  global._mockTheme = 'auto';
  global._mockSystemPrefersDark = false;
  global._mockBackgroundType = 'theme';
  // Mock fetch for /api/theme
  global.fetch = jest.fn(() =>
    Promise.resolve({
      json: () => Promise.resolve({
        light: {
          bodyBgColor: '#fff',
          bodyColor: '#111',
          emphasisColor: '#222',
          textPrimaryColor: '#333',
          textAccentColor: '#444',
        },
        dark: {
          bodyBgColor: '#000',
          bodyColor: '#eee',
          emphasisColor: '#222',
          textPrimaryColor: '#333',
          textAccentColor: '#444',
        }
      }),
    })
  );
  jest.spyOn(document.body.style, 'setProperty');
});
afterEach(() => {
  jest.clearAllMocks();
});

describe('ThemeApplier (theme logic)', () => {
  it('sets correct CSS variables for light and dark theme', async () => {
    render(<ThemeApplier />);
    await waitFor(() => expect(document.body.style.setProperty).toHaveBeenCalled());

    // Set theme to dark
    global._mockTheme = 'dark';
    global._mockBackgroundType = 'theme';
    render(<ThemeApplier />);
    await waitFor(() =>
      expect(document.body.style.setProperty).toHaveBeenCalledWith('--bs-body-bg', '#000')
    );

    // Set theme to light
    global._mockTheme = 'light';
    global._mockBackgroundType = 'theme';
    render(<ThemeApplier />);
    await waitFor(() =>
      expect(document.body.style.setProperty).toHaveBeenCalledWith('--bs-body-bg', '#fff')
    );
  });

  it('uses system dark mode when theme is auto and prefers-color-scheme is dark', async () => {
    global._mockTheme = 'auto';
    global._mockSystemPrefersDark = true;
    global._mockBackgroundType = 'theme';
    render(<ThemeApplier />);
    await waitFor(() =>
      expect(document.body.style.setProperty).toHaveBeenCalledWith('--bs-body-bg', '#000')
    );
  });
});
