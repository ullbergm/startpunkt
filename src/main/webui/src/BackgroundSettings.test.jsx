import { render, screen, fireEvent } from '@testing-library/preact';
import { IntlProvider } from 'preact-i18n';
import { BackgroundSettings } from './BackgroundSettings';

// Mock the useBackgroundPreferences hook
const mockUpdatePreference = jest.fn();
const mockResetToDefaults = jest.fn();

let mockPreferences = {
  type: 'solid',
  color: '#F8F6F1',
  secondaryColor: '#FFFFFF',
  gradientDirection: 'to bottom right',
  imageUrl: '',
  blur: false,
  opacity: 1.0
};

jest.mock('./useBackgroundPreferences', () => ({
  useBackgroundPreferences: () => ({
    preferences: mockPreferences,
    updatePreference: mockUpdatePreference,
    resetToDefaults: mockResetToDefaults
  })
}));

jest.mock('@rehooks/local-storage', () => ({
  useLocalStorage: (key, initial) => [global._mockTheme || initial, jest.fn()],
  writeStorage: jest.fn(),
}));

describe('BackgroundSettings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global._mockTheme = 'light';
    mockPreferences = {
      type: 'solid',
      color: '#F8F6F1',
      secondaryColor: '#FFFFFF',
      gradientDirection: 'to bottom right',
      imageUrl: '',
      blur: false,
      opacity: 1.0
    };
  });

  test('renders background settings button', () => {
    render(
      <IntlProvider definition={{}}>
        <BackgroundSettings />
      </IntlProvider>
    );
    
    const button = screen.getByLabelText('Background settings');
    expect(button).toBeInTheDocument();
  });

  test('toggles settings dropdown when button is clicked', () => {
    render(
      <IntlProvider definition={{}}>
        <BackgroundSettings />
      </IntlProvider>
    );
    
    const button = screen.getByLabelText('Background settings');
    expect(button).toHaveAttribute('data-bs-toggle', 'dropdown');
  });

  test('displays background type selector', () => {
    render(
      <IntlProvider definition={{}}>
        <BackgroundSettings />
      </IntlProvider>
    );
    
    const button = screen.getByLabelText('Background settings');
    fireEvent.click(button);
    
    const select = screen.getByDisplayValue('Solid Color');
    expect(select).toBeInTheDocument();
    
    // Check that all options are present
    expect(screen.getByText('Solid Color')).toBeInTheDocument();
    expect(screen.getByText('Gradient')).toBeInTheDocument();
    expect(screen.getByText('Custom Image')).toBeInTheDocument();
    expect(screen.getByText('Picture of the Day')).toBeInTheDocument();
  });

  test('displays color picker for solid background', () => {
    render(
      <IntlProvider definition={{}}>
        <BackgroundSettings />
      </IntlProvider>
    );
    
    const button = screen.getByLabelText('Background settings');
    fireEvent.click(button);
    
    const colorInput = screen.getByLabelText('Color');
    expect(colorInput).toBeInTheDocument();
    expect(colorInput).toHaveAttribute('type', 'color');
  });

  test('displays opacity slider', () => {
    render(
      <IntlProvider definition={{}}>
        <BackgroundSettings />
      </IntlProvider>
    );
    
    const button = screen.getByLabelText('Background settings');
    fireEvent.click(button);
    
    const opacitySlider = screen.getByRole('slider', { name: /Opacity: 100%/i });
    expect(opacitySlider).toBeInTheDocument();
  });

  test('displays reset button', () => {
    render(
      <IntlProvider definition={{}}>
        <BackgroundSettings />
      </IntlProvider>
    );
    
    const button = screen.getByLabelText('Background settings');
    fireEvent.click(button);
    
    const resetButton = screen.getByText('Reset to Defaults');
    expect(resetButton).toBeInTheDocument();
  });

  test('displays theme mode selection when type is theme', () => {
    mockPreferences.type = 'theme';
    
    render(
      <IntlProvider definition={{}}>
        <BackgroundSettings />
      </IntlProvider>
    );
    
    const button = screen.getByLabelText('Background settings');
    fireEvent.click(button);
    
    expect(screen.getByText('Theme Mode')).toBeInTheDocument();
    expect(screen.getByTitle('Light mode')).toBeInTheDocument();
    expect(screen.getByTitle('Dark mode')).toBeInTheDocument();
    expect(screen.getByTitle('Auto (follow system)')).toBeInTheDocument();
  });

  test('does not display theme mode selection when type is not theme', () => {
    mockPreferences.type = 'solid';
    
    render(
      <IntlProvider definition={{}}>
        <BackgroundSettings />
      </IntlProvider>
    );
    
    const button = screen.getByLabelText('Background settings');
    fireEvent.click(button);
    
    expect(screen.queryByText('Theme Mode')).not.toBeInTheDocument();
  });

  test('does not display opacity slider when type is theme', () => {
    mockPreferences.type = 'theme';
    
    render(
      <IntlProvider definition={{}}>
        <BackgroundSettings />
      </IntlProvider>
    );
    
    const button = screen.getByLabelText('Background settings');
    fireEvent.click(button);
    
    expect(screen.queryByRole('slider', { name: /Opacity/i })).not.toBeInTheDocument();
  });

  test('calls setTheme when theme mode button is clicked', () => {
    const { writeStorage } = require('@rehooks/local-storage');
    mockPreferences.type = 'theme';
    
    render(
      <IntlProvider definition={{}}>
        <BackgroundSettings />
      </IntlProvider>
    );
    
    const button = screen.getByLabelText('Background settings');
    fireEvent.click(button);
    
    // Click dark theme button
    fireEvent.click(screen.getByTitle('Dark mode'));
    expect(writeStorage).toHaveBeenCalledWith('theme', 'dark');
  });
});
