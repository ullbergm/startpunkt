import { useLocalStorage } from '@rehooks/local-storage';

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
 * - savedPresets: object
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
    const dataToSave = presetData || {
      compactMode: preferences.compactMode,
      columnCount: preferences.columnCount,
      showDescription: preferences.showDescription,
      showTags: preferences.showTags,
      showStatus: preferences.showStatus,
      spacing: preferences.spacing
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
      setPreferences({
        ...preferences,
        ...preset,
        currentPreset: name,
        savedPresets: preferences.savedPresets
      });
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
    setPreferences(DEFAULT_PREFERENCES);
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
  const getGridTemplateColumns = () => {
    // Fixed column count
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
