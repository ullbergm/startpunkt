import { useLocalStorage } from '@rehooks/local-storage';

/**
 * Custom hook for managing layout preferences with localStorage persistence
 * 
 * Layout preferences include:
 * - gridSize: 'small' | 'medium' | 'large'
 * - viewMode: 'grid' | 'list'
 * - compactMode: boolean
 * - columnCount: 'auto' | number (2-6)
 * - showDescription: boolean
 * - showTags: boolean
 * - showStatus: boolean
 * - spacing: 'tight' | 'normal' | 'relaxed'
 * - currentPreset: string | null
 * - savedPresets: object
 */

const DEFAULT_PREFERENCES = {
  gridSize: 'medium',
  viewMode: 'grid',
  compactMode: false,
  columnCount: 'auto',
  showDescription: true,
  showTags: true,
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
      // Clear current preset when manually changing settings
      currentPreset: key === 'currentPreset' ? value : null
    });
  };

  const savePreset = (name, presetData = null) => {
    const dataToSave = presetData || {
      gridSize: preferences.gridSize,
      viewMode: preferences.viewMode,
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

    // Card width based on grid size
    switch (preferences.gridSize) {
      case 'small':
        vars['--card-width'] = '200px';
        vars['--card-icon-size'] = '32px';
        vars['--card-font-size'] = '0.875rem';
        break;
      case 'large':
        vars['--card-width'] = '400px';
        vars['--card-icon-size'] = '64px';
        vars['--card-font-size'] = '1.125rem';
        break;
      case 'medium':
      default:
        vars['--card-width'] = '280px';
        vars['--card-icon-size'] = '48px';
        vars['--card-font-size'] = '1rem';
        break;
    }

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
    if (preferences.viewMode === 'list') {
      return '1fr';
    }

    if (preferences.columnCount === 'auto') {
      // Responsive auto-fill based on card width
      return `repeat(auto-fill, minmax(var(--card-width, 280px), 1fr))`;
    }

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
