import { renderHook, act } from '@testing-library/preact';
import { useLayoutPreferences } from './useLayoutPreferences';

// Mock localStorage
const localStorageMock = (() => {
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
  value: localStorageMock
});

describe('useLayoutPreferences', () => {
  beforeEach(() => {
    localStorage.clear();
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
});
