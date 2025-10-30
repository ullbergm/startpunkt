import { h } from 'preact';
import { render, screen, fireEvent, waitFor } from '@testing-library/preact';
import { ThemeSwitcher } from './app';

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

beforeEach(() => {
  global._mockTheme = 'auto';
  global._mockSystemPrefersDark = false;
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

describe('ThemeSwitcher (theme logic)', () => {
  it('sets correct CSS variables for light and dark theme', async () => {
    render(<ThemeSwitcher />);
    await waitFor(() => expect(document.body.style.setProperty).toHaveBeenCalled());

    // Set theme to dark
    global._mockTheme = 'dark';
    render(<ThemeSwitcher />);
    await waitFor(() =>
      expect(document.body.style.setProperty).toHaveBeenCalledWith('--bs-body-bg', '#000')
    );

    // Set theme to light
    global._mockTheme = 'light';
    render(<ThemeSwitcher />);
    await waitFor(() =>
      expect(document.body.style.setProperty).toHaveBeenCalledWith('--bs-body-bg', '#fff')
    );
  });

  it('uses system dark mode when theme is auto and prefers-color-scheme is dark', async () => {
    global._mockTheme = 'auto';
    global._mockSystemPrefersDark = true;
    render(<ThemeSwitcher />);
    await waitFor(() =>
      expect(document.body.style.setProperty).toHaveBeenCalledWith('--bs-body-bg', '#000')
    );
  });
});
