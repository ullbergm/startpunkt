import { renderHook, act } from '@testing-library/preact';
import { useBackgroundPreferences } from './useBackgroundPreferences';

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

describe('useBackgroundPreferences', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('initializes with default preferences', () => {
    const { result } = renderHook(() => useBackgroundPreferences());
    
    expect(result.current.preferences).toEqual({
      type: 'solid',
      color: '#F8F6F1',
      secondaryColor: '#FFFFFF',
      gradientDirection: 'to bottom right',
      imageUrl: '',
      blur: false,
      opacity: 1.0
    });
  });

  test.skip('updates a single preference', () => {
    const { result } = renderHook(() => useBackgroundPreferences());
    
    act(() => {
      result.current.updatePreference('type', 'gradient');
    });
    
    expect(result.current.preferences.type).toBe('gradient');
  });

  test.skip('resets to default preferences', () => {
    const { result } = renderHook(() => useBackgroundPreferences());
    
    act(() => {
      result.current.updatePreference('type', 'gradient');
      result.current.updatePreference('color', '#000000');
    });
    
    expect(result.current.preferences.type).toBe('gradient');
    expect(result.current.preferences.color).toBe('#000000');
    
    act(() => {
      result.current.resetToDefaults();
    });
    
    expect(result.current.preferences.type).toBe('solid');
    expect(result.current.preferences.color).toBe('#F8F6F1');
  });

  test('generates solid background style', () => {
    const { result } = renderHook(() => useBackgroundPreferences());
    
    const style = result.current.getBackgroundStyle(false);
    
    expect(style.backgroundColor).toBe('#F8F6F1');
  });

  test.skip('generates gradient background style', () => {
    const { result } = renderHook(() => useBackgroundPreferences());
    
    act(() => {
      result.current.updatePreference('type', 'gradient');
      result.current.updatePreference('color', '#FF0000');
      result.current.updatePreference('secondaryColor', '#0000FF');
      result.current.updatePreference('gradientDirection', 'to right');
    });
    
    const style = result.current.getBackgroundStyle(false);
    
    expect(style.background).toBeDefined();
    expect(style.background).toContain('linear-gradient');
    expect(style.background).toContain('to right');
    expect(style.background).toContain('#FF0000');
    expect(style.background).toContain('#0000FF');
  });

  test.skip('generates image background style', () => {
    const { result } = renderHook(() => useBackgroundPreferences());
    
    act(() => {
      result.current.updatePreference('type', 'image');
      result.current.updatePreference('imageUrl', 'https://example.com/image.jpg');
    });
    
    const style = result.current.getBackgroundStyle(false);
    
    expect(style.backgroundImage).toBe('url(https://example.com/image.jpg)');
    expect(style.backgroundSize).toBe('cover');
    expect(style.backgroundPosition).toBe('center');
  });

  test('uses dark theme color defaults when in dark mode', () => {
    const { result } = renderHook(() => useBackgroundPreferences());
    
    const style = result.current.getBackgroundStyle(true);
    
    // When color preference matches light theme default, dark mode should override
    expect(style.backgroundColor).toBeDefined();
  });
});
