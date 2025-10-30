import { renderHook, act } from '@testing-library/preact';
import { useLayoutPreferences } from './useLayoutPreferences';

// Mock localStorage
const mockLocalStorageMock = (() => {
  let store = {};
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => {
      store[key] = value.toString();
    },
    removeItem: (key) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    }
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorageMock
});

// Mock @rehooks/local-storage
const mockWriteStorage = jest.fn();

jest.mock('@rehooks/local-storage', () => {
  let mockStorage = {};
  
  return {
    useLocalStorage: (key, defaultValue) => {
      const [state, setState] = require('preact/hooks').useState(() => {
        const stored = mockStorage[key];
        return stored !== undefined ? stored : defaultValue;
      });
      
      const setValue = (value) => {
        mockStorage[key] = value;
        setState(value);
      };
      
      return [state, setValue];
    },
    writeStorage: (key, value) => {
      mockStorage[key] = value;
      mockWriteStorage(key, value);
    }
  };
});

describe('useLayoutPreferences', () => {
  beforeEach(() => {
    localStorage.clear();
    mockWriteStorage.mockClear();
  });

  test('should initialize with default preferences', () => {
    const { result } = renderHook(() => useLayoutPreferences());
    
    expect(result.current.preferences.compactMode).toBe(true);
    expect(result.current.preferences.columnCount).toBe(5);
    expect(result.current.preferences.showDescription).toBe(true);
    expect(result.current.preferences.showTags).toBe(false);
    expect(result.current.preferences.showStatus).toBe(true);
    expect(result.current.preferences.spacing).toBe('normal');
  });

  test('should update individual preference', () => {
    const { result } = renderHook(() => useLayoutPreferences());
    
    act(() => {
      result.current.updatePreference('compactMode', false);
    });
    
    expect(result.current.preferences.compactMode).toBe(false);
  });

  test('should clear current preset when manually changing settings', () => {
    const { result } = renderHook(() => useLayoutPreferences());
    
    act(() => {
      result.current.savePreset('myPreset');
    });
    
    expect(result.current.preferences.currentPreset).toBe('myPreset');
    
    act(() => {
      result.current.updatePreference('compactMode', false);
    });
    
    expect(result.current.preferences.currentPreset).toBeNull();
  });

  test('should save preset with current settings', () => {
    const { result } = renderHook(() => useLayoutPreferences());
    
    act(() => {
      result.current.updatePreference('spacing', 'wide');
    });
    
    act(() => {
      result.current.updatePreference('columnCount', 3);
    });
    
    act(() => {
      result.current.savePreset('wideThreeColumn');
    });
    
    expect(result.current.preferences.savedPresets.wideThreeColumn).toBeDefined();
    expect(result.current.preferences.savedPresets.wideThreeColumn.spacing).toBe('wide');
    expect(result.current.preferences.savedPresets.wideThreeColumn.columnCount).toBe(3);
    expect(result.current.preferences.currentPreset).toBe('wideThreeColumn');
  });

  test('should load preset', () => {
    const { result } = renderHook(() => useLayoutPreferences());
    
    act(() => {
      result.current.savePreset('testPreset', {
        compactMode: false,
        columnCount: 4,
        showDescription: false,
        showTags: true,
        showStatus: false,
        spacing: 'tight'
      });
    });
    
    // Change settings
    act(() => {
      result.current.updatePreference('spacing', 'wide');
      result.current.updatePreference('compactMode', true);
    });
    
    // Load preset
    act(() => {
      result.current.loadPreset('testPreset');
    });
    
    expect(result.current.preferences.spacing).toBe('tight');
    expect(result.current.preferences.compactMode).toBe(false);
    expect(result.current.preferences.currentPreset).toBe('testPreset');
  });

  test('should delete preset', () => {
    const { result } = renderHook(() => useLayoutPreferences());
    
    act(() => {
      result.current.savePreset('toDelete');
    });
    
    expect(result.current.preferences.savedPresets.toDelete).toBeDefined();
    
    act(() => {
      result.current.deletePreset('toDelete');
    });
    
    expect(result.current.preferences.savedPresets.toDelete).toBeUndefined();
    expect(result.current.preferences.currentPreset).toBeNull();
  });

  test('should reset to defaults', () => {
    const { result } = renderHook(() => useLayoutPreferences());
    
    act(() => {
      result.current.updatePreference('spacing', 'wide');
      result.current.updatePreference('compactMode', false);
      result.current.savePreset('test');
    });
    
    act(() => {
      result.current.resetToDefaults();
    });
    
    expect(result.current.preferences.spacing).toBe('normal');
    expect(result.current.preferences.compactMode).toBe(true);
    expect(result.current.preferences.savedPresets).toEqual({});
  });

  test('should generate CSS variables for tight spacing', () => {
    const { result } = renderHook(() => useLayoutPreferences());
    
    act(() => {
      result.current.updatePreference('spacing', 'tight');
    });
    
    const vars = result.current.getCSSVariables();
    expect(vars['--card-gap']).toBe('0.5rem');
  });

  test('should generate CSS variables for compact mode', () => {
    const { result } = renderHook(() => useLayoutPreferences());
    
    act(() => {
      result.current.updatePreference('compactMode', true);
    });
    
    const vars = result.current.getCSSVariables();
    expect(vars['--card-padding']).toBe('0.5rem');
    expect(vars['--group-spacing']).toBe('1rem');
  });

  test('should generate grid template columns for fixed column count', () => {
    const { result } = renderHook(() => useLayoutPreferences());
    
    act(() => {
      result.current.updatePreference('columnCount', 4);
    });
    
    const columns = result.current.getGridTemplateColumns();
    expect(columns).toBe('repeat(4, 1fr)');
  });

  test('should save preset with background settings from localStorage', () => {
    // Set up background preferences in localStorage
    const backgroundPrefs = {
      type: 'gradient',
      color: '#FF0000',
      secondaryColor: '#0000FF',
      opacity: 0.8
    };
    localStorage.setItem('startpunkt:background-preferences', JSON.stringify(backgroundPrefs));
    
    const { result } = renderHook(() => useLayoutPreferences());
    
    // First change the spacing
    act(() => {
      result.current.updatePreference('spacing', 'wide');
    });
    
    // Then save preset (which will capture current settings including the updated spacing)
    act(() => {
      result.current.savePreset('withBackground');
    });
    
    // Verify background settings are included in the preset
    const savedPreset = result.current.preferences.savedPresets.withBackground;
    expect(savedPreset).toBeDefined();
    expect(savedPreset.background).toEqual(backgroundPrefs);
    // Note: updatePreference clears currentPreset, but savePreset should have the latest values
    expect(savedPreset.spacing).toBe('wide');
  });

  test('should load preset with background settings', () => {
    const { result } = renderHook(() => useLayoutPreferences());
    
    const backgroundPrefs = {
      type: 'solid',
      color: '#00FF00',
      opacity: 1.0
    };
    
    // Save a preset with background settings
    act(() => {
      result.current.savePreset('testWithBg', {
        spacing: 'tight',
        compactMode: false,
        background: backgroundPrefs
      });
    });
    
    // Change settings to something else first
    act(() => {
      result.current.updatePreference('spacing', 'wide');
      result.current.updatePreference('compactMode', true);
    });
    
    // Clear the mock to check only the loadPreset call
    mockWriteStorage.mockClear();
    
    // Load the preset
    act(() => {
      result.current.loadPreset('testWithBg');
    });
    
    // Verify layout settings were applied
    expect(result.current.preferences.spacing).toBe('tight');
    expect(result.current.preferences.compactMode).toBe(false);
    
    // writeStorage should have been called with background preferences
    expect(mockWriteStorage).toHaveBeenCalledWith('startpunkt:background-preferences', backgroundPrefs);
  });

  test('should handle presets without background settings', () => {
    const { result } = renderHook(() => useLayoutPreferences());
    
    // Save a preset without background settings (legacy compatibility)
    act(() => {
      result.current.savePreset('legacyPreset', {
        spacing: 'relaxed',
        compactMode: true
      });
    });
    
    // Load the preset
    act(() => {
      result.current.loadPreset('legacyPreset');
    });
    
    // Verify layout settings were applied without errors
    expect(result.current.preferences.spacing).toBe('relaxed');
    expect(result.current.preferences.compactMode).toBe(true);
  });
});
