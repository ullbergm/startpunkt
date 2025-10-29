import { render, screen, fireEvent } from '@testing-library/preact';
import { IntlProvider } from 'preact-i18n';
import { LayoutSettings } from './LayoutSettings';

describe('LayoutSettings', () => {
  const mockLayoutPrefs = {
    preferences: {
      compactMode: true,
      columnCount: 5,
      showDescription: true,
      showTags: false,
      showStatus: true,
      spacing: 'tight',
      currentPreset: null,
      savedPresets: {}
    },
    updatePreference: jest.fn(),
    savePreset: jest.fn(),
    loadPreset: jest.fn(),
    deletePreset: jest.fn(),
    resetToDefaults: jest.fn(),
    getCSSVariables: jest.fn(() => ({})),
    getGridTemplateColumns: jest.fn(() => 'repeat(5, 1fr)')
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders layout settings button', () => {
    render(
      <IntlProvider definition={{}}>
        <LayoutSettings layoutPrefs={mockLayoutPrefs} />
      </IntlProvider>
    );
    
    const button = screen.getByLabelText('Layout settings');
    expect(button).toBeInTheDocument();
  });

  test('toggles settings dropdown when button is clicked', () => {
    render(
      <IntlProvider definition={{}}>
        <LayoutSettings layoutPrefs={mockLayoutPrefs} />
      </IntlProvider>
    );
    
    const button = screen.getByLabelText('Layout settings');
    expect(button).toHaveAttribute('data-bs-toggle', 'dropdown');
  });

  test('changes column count', () => {
    render(
      <IntlProvider definition={{}}>
        <LayoutSettings layoutPrefs={mockLayoutPrefs} />
      </IntlProvider>
    );
    
    const button = screen.getByLabelText('Layout settings');
    fireEvent.click(button);
    
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: '4' } });
    
    expect(mockLayoutPrefs.updatePreference).toHaveBeenCalledWith('columnCount', 4);
  });

  test('toggles compact mode', () => {
    render(
      <IntlProvider definition={{}}>
        <LayoutSettings layoutPrefs={mockLayoutPrefs} />
      </IntlProvider>
    );
    
    const button = screen.getByLabelText('Layout settings');
    fireEvent.click(button);
    
    const compactCheckbox = screen.getByLabelText('Compact Mode');
    fireEvent.click(compactCheckbox);
    
    expect(mockLayoutPrefs.updatePreference).toHaveBeenCalledWith('compactMode', false);
  });

  test('changes spacing setting', () => {
    render(
      <IntlProvider definition={{}}>
        <LayoutSettings layoutPrefs={mockLayoutPrefs} />
      </IntlProvider>
    );
    
    const button = screen.getByLabelText('Layout settings');
    fireEvent.click(button);
    
    const normalButton = screen.getByLabelText('Normal');
    fireEvent.click(normalButton);
    
    expect(mockLayoutPrefs.updatePreference).toHaveBeenCalledWith('spacing', 'normal');
  });

  test('toggles card content visibility options', () => {
    render(
      <IntlProvider definition={{}}>
        <LayoutSettings layoutPrefs={mockLayoutPrefs} />
      </IntlProvider>
    );
    
    const button = screen.getByLabelText('Layout settings');
    fireEvent.click(button);
    
    const descCheckbox = screen.getByLabelText('Description');
    fireEvent.click(descCheckbox);
    
    expect(mockLayoutPrefs.updatePreference).toHaveBeenCalledWith('showDescription', false);
  });

  test('shows save preset input when button clicked', () => {
    render(
      <IntlProvider definition={{}}>
        <LayoutSettings layoutPrefs={mockLayoutPrefs} />
      </IntlProvider>
    );
    
    const button = screen.getByLabelText('Layout settings');
    fireEvent.click(button);
    
    const saveButton = screen.getByText('+ Save Current as Preset');
    fireEvent.click(saveButton);
    
    expect(screen.getByPlaceholderText('Preset name')).toBeInTheDocument();
  });

  test('saves a new preset', () => {
    render(
      <IntlProvider definition={{}}>
        <LayoutSettings layoutPrefs={mockLayoutPrefs} />
      </IntlProvider>
    );
    
    const button = screen.getByLabelText('Layout settings');
    fireEvent.click(button);
    
    const saveButton = screen.getByText('+ Save Current as Preset');
    fireEvent.click(saveButton);
    
    const input = screen.getByPlaceholderText('Preset name');
    fireEvent.input(input, { target: { value: 'My Preset' } });
    
    const confirmButton = screen.getByText('Save');
    fireEvent.click(confirmButton);
    
    expect(mockLayoutPrefs.savePreset).toHaveBeenCalledWith('My Preset');
  });

  test('displays saved presets', () => {
    const prefsWithPresets = {
      ...mockLayoutPrefs,
      preferences: {
        ...mockLayoutPrefs.preferences,
        savedPresets: {
          'Preset 1': { spacing: 'tight' },
          'Preset 2': { spacing: 'wide' }
        }
      }
    };
    
    render(
      <IntlProvider definition={{}}>
        <LayoutSettings layoutPrefs={prefsWithPresets} />
      </IntlProvider>
    );
    
    const button = screen.getByLabelText('Layout settings');
    fireEvent.click(button);
    
    expect(screen.getByText('Preset 1')).toBeInTheDocument();
    expect(screen.getByText('Preset 2')).toBeInTheDocument();
  });

  test('loads a preset when clicked', () => {
    const prefsWithPresets = {
      ...mockLayoutPrefs,
      preferences: {
        ...mockLayoutPrefs.preferences,
        savedPresets: {
          'Test Preset': { spacing: 'tight' }
        }
      }
    };
    
    render(
      <IntlProvider definition={{}}>
        <LayoutSettings layoutPrefs={prefsWithPresets} />
      </IntlProvider>
    );
    
    const button = screen.getByLabelText('Layout settings');
    fireEvent.click(button);
    
    const presetButton = screen.getByText('Test Preset');
    fireEvent.click(presetButton);
    
    expect(mockLayoutPrefs.loadPreset).toHaveBeenCalledWith('Test Preset');
  });

  test('deletes a preset', () => {
    const prefsWithPresets = {
      ...mockLayoutPrefs,
      preferences: {
        ...mockLayoutPrefs.preferences,
        savedPresets: {
          'To Delete': { spacing: 'tight' }
        }
      }
    };
    
    render(
      <IntlProvider definition={{}}>
        <LayoutSettings layoutPrefs={prefsWithPresets} />
      </IntlProvider>
    );
    
    const button = screen.getByLabelText('Layout settings');
    fireEvent.click(button);
    
    const deleteButton = screen.getByLabelText('Delete To Delete');
    fireEvent.click(deleteButton);
    
    expect(mockLayoutPrefs.deletePreset).toHaveBeenCalledWith('To Delete');
  });

  test('resets to defaults', () => {
    render(
      <IntlProvider definition={{}}>
        <LayoutSettings layoutPrefs={mockLayoutPrefs} />
      </IntlProvider>
    );
    
    const button = screen.getByLabelText('Layout settings');
    fireEvent.click(button);
    
    const resetButton = screen.getByText('Reset to Defaults');
    fireEvent.click(resetButton);
    
    expect(mockLayoutPrefs.resetToDefaults).toHaveBeenCalled();
  });
});
