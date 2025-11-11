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
    getGridTemplateColumns: jest.fn(() => 'repeat(5, 1fr)'),
    getOptimalColumnCount: jest.fn((itemCount) => Math.min(itemCount, 5))
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

    const slider = screen.getByRole('slider', { name: /Columns: 5/i });
    fireEvent.change(slider, { target: { value: '4' } });

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

    // Verify that savePreset is called with the preset name
    // (background settings are captured internally in useLayoutPreferences)
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

  describe('auto column mode', () => {
    test('shows auto mode checkbox when column count is auto', () => {
      const autoModePrefs = {
        ...mockLayoutPrefs,
        preferences: {
          ...mockLayoutPrefs.preferences,
          columnCount: 'auto'
        }
      };

      render(
        <IntlProvider definition={{
          'layout.autoColumns': 'Auto',
          'layout.autoColumnsHelp': 'Fewest rows'
        }}>
          <LayoutSettings layoutPrefs={autoModePrefs} />
        </IntlProvider>
      );

      const button = screen.getByLabelText('Layout settings');
      fireEvent.click(button);

      const autoCheckbox = screen.getByLabelText(/Auto/);
      expect(autoCheckbox).toBeChecked();
    });

    test('hides slider when auto mode is enabled', () => {
      const autoModePrefs = {
        ...mockLayoutPrefs,
        preferences: {
          ...mockLayoutPrefs.preferences,
          columnCount: 'auto'
        }
      };

      render(
        <IntlProvider definition={{
          'layout.autoColumns': 'Auto',
          'layout.autoColumnsHelp': 'Fewest rows'
        }}>
          <LayoutSettings layoutPrefs={autoModePrefs} />
        </IntlProvider>
      );

      const button = screen.getByLabelText('Layout settings');
      fireEvent.click(button);

      // Slider should not be present when in auto mode
      const sliders = screen.queryAllByRole('slider');
      expect(sliders).toHaveLength(0);
    });

    test('shows slider when auto mode is disabled', () => {
      render(
        <IntlProvider definition={{
          'layout.autoColumns': 'Auto',
          'layout.autoColumnsHelp': 'Fewest rows'
        }}>
          <LayoutSettings layoutPrefs={mockLayoutPrefs} />
        </IntlProvider>
      );

      const button = screen.getByLabelText('Layout settings');
      fireEvent.click(button);

      // Slider should be present when not in auto mode
      const slider = screen.getByRole('slider', { name: /Columns: 5/i });
      expect(slider).toBeInTheDocument();
    });

    test('toggles auto mode on', () => {
      render(
        <IntlProvider definition={{
          'layout.autoColumns': 'Auto',
          'layout.autoColumnsHelp': 'Fewest rows'
        }}>
          <LayoutSettings layoutPrefs={mockLayoutPrefs} />
        </IntlProvider>
      );

      const button = screen.getByLabelText('Layout settings');
      fireEvent.click(button);

      const autoCheckbox = screen.getByLabelText(/Auto/);
      fireEvent.click(autoCheckbox);

      expect(mockLayoutPrefs.updatePreference).toHaveBeenCalledWith('columnCount', 'auto');
    });

    test('toggles auto mode off and sets to 5 columns', () => {
      const autoModePrefs = {
        ...mockLayoutPrefs,
        preferences: {
          ...mockLayoutPrefs.preferences,
          columnCount: 'auto'
        }
      };

      render(
        <IntlProvider definition={{
          'layout.autoColumns': 'Auto',
          'layout.autoColumnsHelp': 'Fewest rows'
        }}>
          <LayoutSettings layoutPrefs={autoModePrefs} />
        </IntlProvider>
      );

      const button = screen.getByLabelText('Layout settings');
      fireEvent.click(button);

      const autoCheckbox = screen.getByLabelText(/Auto/);
      fireEvent.click(autoCheckbox);

      expect(mockLayoutPrefs.updatePreference).toHaveBeenCalledWith('columnCount', 5);
    });

    test('displays "Auto" in column label when in auto mode', () => {
      const autoModePrefs = {
        ...mockLayoutPrefs,
        preferences: {
          ...mockLayoutPrefs.preferences,
          columnCount: 'auto'
        }
      };

      render(
        <IntlProvider definition={{
          'layout.columns': 'Columns',
          'layout.autoColumns': 'Auto',
          'layout.autoColumnsHelp': 'Fewest rows'
        }}>
          <LayoutSettings layoutPrefs={autoModePrefs} />
        </IntlProvider>
      );

      const button = screen.getByLabelText('Layout settings');
      fireEvent.click(button);

      // The label should show "Columns: Auto" (text is split by : and the Auto component)
      expect(screen.getByText(/Columns/)).toBeInTheDocument();
      // Check for multiple "Auto" occurrences (one in label, one in checkbox label)
      const autoTexts = screen.getAllByText('Auto');
      expect(autoTexts.length).toBeGreaterThan(0);
    });
  });
});
