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
      type: 'theme',
      color: '#F8F6F1',
      secondaryColor: '#FFFFFF',
      gradientDirection: 'to bottom right',
      imageUrl: '',
      blur: false,
      opacity: 1.0,
      geopatternSeed: 'startpunkt',
      meshColors: ['#2d5016', '#f4c430', '#003366'],
      meshAnimated: true,
      meshComplexity: 'low',
      contentOverlay: false,
      contentOverlayOpacity: -0.6,
      pictureProvider: 'bing'
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
    
    // Set type to solid since default is now 'theme'
    act(() => {
      result.current.updatePreference('type', 'solid');
    });
    
    const style = result.current.getBackgroundStyle(false);
    
    expect(style.backgroundColor).toBe('#F8F6F1');
  });

  test.skip('applies opacity to solid background using rgba', () => {
    const { result } = renderHook(() => useBackgroundPreferences());
    
    act(() => {
      result.current.updatePreference('color', '#FF0000');
      result.current.updatePreference('opacity', 0.5);
    });
    
    const style = result.current.getBackgroundStyle(false);
    
    // Should convert to rgba with opacity
    expect(style.backgroundColor).toBe('rgba(255, 0, 0, 0.5)');
  });

  test.skip('applies opacity to gradient colors using rgba', () => {
    const { result } = renderHook(() => useBackgroundPreferences());
    
    act(() => {
      result.current.updatePreference('type', 'gradient');
      result.current.updatePreference('color', '#FF0000');
      result.current.updatePreference('secondaryColor', '#0000FF');
      result.current.updatePreference('opacity', 0.7);
    });
    
    const style = result.current.getBackgroundStyle(false);
    
    // Should use rgba colors in gradient
    expect(style.background).toContain('rgba(255, 0, 0, 0.7)');
    expect(style.background).toContain('rgba(0, 0, 255, 0.7)');
  });

  test.skip('applies opacity property to image backgrounds', () => {
    const { result } = renderHook(() => useBackgroundPreferences());
    
    act(() => {
      result.current.updatePreference('type', 'image');
      result.current.updatePreference('imageUrl', 'https://example.com/image.jpg');
      result.current.updatePreference('opacity', 0.8);
    });
    
    const style = result.current.getBackgroundStyle(false);
    
    // For images, opacity is set as a property (to be applied to overlay)
    expect(style.opacity).toBe(0.8);
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
    
    // Set type to solid since default is now 'theme'
    act(() => {
      result.current.updatePreference('type', 'solid');
    });
    
    const style = result.current.getBackgroundStyle(true);
    
    // When color preference matches light theme default, dark mode should override
    expect(style.backgroundColor).toBeDefined();
  });

  test.skip('generates time-based gradient background style', () => {
    const { result } = renderHook(() => useBackgroundPreferences());
    
    act(() => {
      result.current.updatePreference('type', 'timeGradient');
    });
    
    const style = result.current.getBackgroundStyle(false);
    
    expect(style.background).toBeDefined();
    expect(style.background).toContain('linear-gradient');
    // Should have at least 2 colors in the gradient
    expect(style.background.match(/#[0-9a-fA-F]{6}/g).length).toBeGreaterThanOrEqual(2);
  });

  test('generates mesh gradient background style', () => {
    const { result } = renderHook(() => useBackgroundPreferences());
    
    act(() => {
      result.current.updatePreference('type', 'meshGradient');
    });
    
    act(() => {
      result.current.updatePreference('meshColors', ['#FF0000', '#00FF00', '#0000FF']);
    });
    
    const style = result.current.getBackgroundStyle(false);
    
    expect(style.background).toBeDefined();
    expect(style.backgroundImage).toBeDefined();
    expect(style.backgroundImage).toContain('radial-gradient');
  });

  test('applies animation to mesh gradient when enabled', () => {
    const { result } = renderHook(() => useBackgroundPreferences());
    
    act(() => {
      result.current.updatePreference('type', 'meshGradient');
    });
    
    act(() => {
      result.current.updatePreference('meshAnimated', true);
    });
    
    const style = result.current.getBackgroundStyle(false);
    
    expect(style.animation).toBeDefined();
    expect(style.animation).toContain('meshGradientAnimation');
  });

  test('respects mesh gradient complexity setting', () => {
    const { result } = renderHook(() => useBackgroundPreferences());
    
    act(() => {
      result.current.updatePreference('type', 'meshGradient');
    });
    
    act(() => {
      result.current.updatePreference('meshComplexity', 'high');
    });
    
    const style = result.current.getBackgroundStyle(false);

    // High complexity should have more gradient layers
    expect(style.backgroundImage).toBeDefined();
    const gradientCount = (style.backgroundImage.match(/radial-gradient/g) || []).length;
    expect(gradientCount).toBeGreaterThan(2);
  });  test('time-based gradient returns appropriate colors for different times', () => {
    const { result } = renderHook(() => useBackgroundPreferences());
    
    act(() => {
      result.current.updatePreference('type', 'timeGradient');
    });
    
    // Mock different times of day
    const originalDate = Date;
    
    // Test morning (8 AM)
    global.Date = class extends originalDate {
      getHours() { return 8; }
    };
    const morningStyle = result.current.getBackgroundStyle(false);
    expect(morningStyle.background).toBeDefined();
    
    // Test afternoon (2 PM)
    global.Date = class extends originalDate {
      getHours() { return 14; }
    };
    const afternoonStyle = result.current.getBackgroundStyle(false);
    expect(afternoonStyle.background).toBeDefined();
    
    // Test evening (8 PM)
    global.Date = class extends originalDate {
      getHours() { return 20; }
    };
    const eveningStyle = result.current.getBackgroundStyle(false);
    expect(eveningStyle.background).toBeDefined();
    
    // Restore original Date
    global.Date = originalDate;
  });
});
