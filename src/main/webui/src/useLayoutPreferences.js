import { useLocalStorage, writeStorage } from '@rehooks/local-storage';

/**
 * Custom hook for managing layout preferences with localStorage persistence
 * 
 * Layout preferences include:
 * - compactMode: boolean
 * - columnCount: number (1-6)
 * - showDescription: boolean
 * - showTags: boolean
 * - showStatus: boolean
 * - spacing: 'tight' | 'normal' | 'relaxed'
 * - currentPreset: string | null
 * - savedPresets: object (each preset can include both layout and background settings)
 */

const DEFAULT_PREFERENCES = {
  compactMode: true,
  columnCount: 5,
  showDescription: true,
  showTags: false,
  showStatus: true,
  spacing: 'normal',
  currentPreset: null,
  savedPresets: {}
};

// Helper to get current background preferences from localStorage
const getBackgroundPreferences = () => {
  try {
    const stored = localStorage.getItem('startpunkt:background-preferences');
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
};

// Helper to set background preferences using writeStorage to trigger hook updates
const setBackgroundPreferences = (bgPrefs) => {
  try {
    writeStorage('startpunkt:background-preferences', bgPrefs);
  } catch (err) {
    console.error('Failed to save background preferences:', err);
  }
};

export function useLayoutPreferences() {
  const [preferences, setPreferences] = useLocalStorage(
    'startpunkt:layout-preferences',
    DEFAULT_PREFERENCES
  );

  const updatePreference = (key, value) => {
    setPreferences({
      ...preferences,
      [key]: value,
      // Clear current preset when manually changing settings (except when setting preset itself)
      // This ensures users know they've deviated from a saved preset
      currentPreset: key === 'currentPreset' ? value : null
    });
  };

  const savePreset = (name, presetData = null) => {
    // Get current background preferences to include in the preset
    const backgroundPrefs = getBackgroundPreferences();
    
    const dataToSave = presetData || {
      // Layout settings
      compactMode: preferences.compactMode,
      columnCount: preferences.columnCount,
      showDescription: preferences.showDescription,
      showTags: preferences.showTags,
      showStatus: preferences.showStatus,
      spacing: preferences.spacing,
      // Background settings (if available)
      background: backgroundPrefs || undefined
    };

    setPreferences({
      ...preferences,
      savedPresets: {
        ...preferences.savedPresets,
        [name]: dataToSave
      },
      currentPreset: name
    });
  };

  const loadPreset = (name) => {
    const preset = preferences.savedPresets[name];
    if (preset) {
      // Extract background settings if they exist in the preset
      const { background, ...layoutSettings } = preset;
      
      // Apply layout settings
      setPreferences({
        ...preferences,
        ...layoutSettings,
        currentPreset: name,
        savedPresets: preferences.savedPresets
      });
      
      // Apply background settings if they exist
      if (background) {
        // Use writeStorage to ensure all hooks using this key are notified
        setBackgroundPreferences(background);
      }
    }
  };

  const deletePreset = (name) => {
    const newPresets = { ...preferences.savedPresets };
    delete newPresets[name];
    
    setPreferences({
      ...preferences,
      savedPresets: newPresets,
      currentPreset: preferences.currentPreset === name ? null : preferences.currentPreset
    });
  };

  const resetToDefaults = () => {
    // Preserve saved presets when resetting to defaults
    setPreferences({
      ...DEFAULT_PREFERENCES,
      savedPresets: preferences.savedPresets
    });
  };

  // Get CSS variables based on current preferences
  const getCSSVariables = () => {
    const vars = {};

    // Gap/spacing between cards
    switch (preferences.spacing) {
      case 'tight':
        vars['--card-gap'] = '0.5rem';
        break;
      case 'relaxed':
        vars['--card-gap'] = '2rem';
        break;
      case 'normal':
      default:
        vars['--card-gap'] = '1rem';
        break;
    }

    // Compact mode adjustments
    if (preferences.compactMode) {
      vars['--card-padding'] = '0.5rem';
      vars['--group-spacing'] = '1rem';
    } else {
      vars['--card-padding'] = '1rem';
      vars['--group-spacing'] = '3rem';
    }

    return vars;
  };

  // Get grid template columns based on column count
  // Mobile responsiveness is handled via CSS media queries in components
  const getGridTemplateColumns = () => {
    return `repeat(${preferences.columnCount}, 1fr)`;
  };

  return {
    preferences,
    updatePreference,
    savePreset,
    loadPreset,
    deletePreset,
    resetToDefaults,
    getCSSVariables,
    getGridTemplateColumns
  };
}

export default useLayoutPreferences;
