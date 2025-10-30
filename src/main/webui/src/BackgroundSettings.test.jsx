import { render, screen, fireEvent } from '@testing-library/preact';
import { IntlProvider } from 'preact-i18n';
import { BackgroundSettings } from './BackgroundSettings';

// Mock the useBackgroundPreferences hook
jest.mock('./useBackgroundPreferences', () => ({
  useBackgroundPreferences: () => ({
    preferences: {
      type: 'solid',
      color: '#F8F6F1',
      secondaryColor: '#FFFFFF',
      gradientDirection: 'to bottom right',
      imageUrl: '',
      blur: false,
      opacity: 1.0
    },
    updatePreference: jest.fn(),
    resetToDefaults: jest.fn()
  })
}));

describe('BackgroundSettings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
});
