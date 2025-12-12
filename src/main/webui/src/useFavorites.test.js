import { renderHook, act } from '@testing-library/preact';
import { useFavorites, getApplicationId } from './useFavorites';

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
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

describe('getApplicationId', () => {
  test('generates ID from namespace and resourceName', () => {
    const app = {
      namespace: 'production',
      resourceName: 'my-app',
      name: 'My App'
    };
    expect(getApplicationId(app)).toBe('production/my-app');
  });

  test('uses default namespace when not provided', () => {
    const app = {
      resourceName: 'my-app',
      name: 'My App'
    };
    expect(getApplicationId(app)).toBe('default/my-app');
  });

  test('falls back to name when resourceName not provided', () => {
    const app = {
      namespace: 'production',
      name: 'My App'
    };
    expect(getApplicationId(app)).toBe('production/My App');
  });

  test('returns null for null app', () => {
    expect(getApplicationId(null)).toBe(null);
  });

  test('returns null for undefined app', () => {
    expect(getApplicationId(undefined)).toBe(null);
  });
});

describe('useFavorites', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  test('initializes with empty favorites', () => {
    const { result } = renderHook(() => useFavorites());
    expect(result.current.favorites).toEqual([]);
  });

  test('isFavorite returns false for non-favorited app', () => {
    const { result } = renderHook(() => useFavorites());
    const app = { namespace: 'default', resourceName: 'app1', name: 'App 1' };
    expect(result.current.isFavorite(app)).toBe(false);
  });

  test('getFavoriteIndex returns -1 for non-favorited app', () => {
    const { result } = renderHook(() => useFavorites());
    const app = { namespace: 'default', resourceName: 'app1', name: 'App 1' };
    expect(result.current.getFavoriteIndex(app)).toBe(-1);
  });

  test('getFavoriteIndex returns correct index for favorited app', () => {
    const { result } = renderHook(() => useFavorites());
    const app1 = { namespace: 'default', resourceName: 'app1', name: 'App 1' };
    const app2 = { namespace: 'default', resourceName: 'app2', name: 'App 2' };
    const app3 = { namespace: 'default', resourceName: 'app3', name: 'App 3' };

    act(() => {
      result.current.addFavorite(app1);
      result.current.addFavorite(app2);
      result.current.addFavorite(app3);
    });

    expect(result.current.getFavoriteIndex(app1)).toBe(0);
    expect(result.current.getFavoriteIndex(app2)).toBe(1);
    expect(result.current.getFavoriteIndex(app3)).toBe(2);
  });

  test('getFavoriteIndex returns -1 for null app', () => {
    const { result } = renderHook(() => useFavorites());
    expect(result.current.getFavoriteIndex(null)).toBe(-1);
  });

  test('getFavoriteIndex updates after reordering', () => {
    const { result } = renderHook(() => useFavorites());
    const app1 = { namespace: 'default', resourceName: 'app1', name: 'App 1' };
    const app2 = { namespace: 'default', resourceName: 'app2', name: 'App 2' };

    act(() => {
      result.current.addFavorite(app1);
      result.current.addFavorite(app2);
    });

    expect(result.current.getFavoriteIndex(app1)).toBe(0);
    expect(result.current.getFavoriteIndex(app2)).toBe(1);

    act(() => {
      result.current.reorderFavorites(0, 1);
    });

    expect(result.current.getFavoriteIndex(app1)).toBe(1);
    expect(result.current.getFavoriteIndex(app2)).toBe(0);
  });

  test('toggleFavorite adds app to favorites', () => {
    const { result } = renderHook(() => useFavorites());
    const app = { namespace: 'default', resourceName: 'app1', name: 'App 1' };

    act(() => {
      result.current.toggleFavorite(app);
    });

    expect(result.current.isFavorite(app)).toBe(true);
    expect(result.current.favorites).toContain('default/app1');
  });

  test('toggleFavorite removes app from favorites', () => {
    const { result } = renderHook(() => useFavorites());
    const app = { namespace: 'default', resourceName: 'app1', name: 'App 1' };

    act(() => {
      result.current.toggleFavorite(app);
    });
    expect(result.current.isFavorite(app)).toBe(true);

    act(() => {
      result.current.toggleFavorite(app);
    });
    expect(result.current.isFavorite(app)).toBe(false);
    expect(result.current.favorites).not.toContain('default/app1');
  });

  test('addFavorite adds app to favorites', () => {
    const { result } = renderHook(() => useFavorites());
    const app = { namespace: 'default', resourceName: 'app1', name: 'App 1' };

    act(() => {
      result.current.addFavorite(app);
    });

    expect(result.current.isFavorite(app)).toBe(true);
    expect(result.current.favorites).toContain('default/app1');
  });

  test('addFavorite does not add duplicate', () => {
    const { result } = renderHook(() => useFavorites());
    const app = { namespace: 'default', resourceName: 'app1', name: 'App 1' };

    act(() => {
      result.current.addFavorite(app);
      result.current.addFavorite(app);
    });

    expect(result.current.favorites).toEqual(['default/app1']);
  });

  test('removeFavorite removes app from favorites', () => {
    const { result } = renderHook(() => useFavorites());
    const app = { namespace: 'default', resourceName: 'app1', name: 'App 1' };

    act(() => {
      result.current.addFavorite(app);
    });
    expect(result.current.isFavorite(app)).toBe(true);

    act(() => {
      result.current.removeFavorite(app);
    });
    expect(result.current.isFavorite(app)).toBe(false);
  });

  test('clearFavorites removes all favorites', () => {
    const { result } = renderHook(() => useFavorites());
    const app1 = { namespace: 'default', resourceName: 'app1', name: 'App 1' };
    const app2 = { namespace: 'default', resourceName: 'app2', name: 'App 2' };

    act(() => {
      result.current.addFavorite(app1);
    });

    act(() => {
      result.current.addFavorite(app2);
    });
    expect(result.current.favorites.length).toBe(2);

    act(() => {
      result.current.clearFavorites();
    });
    expect(result.current.favorites).toEqual([]);
  });

  test('exportFavorites returns JSON string', () => {
    const { result } = renderHook(() => useFavorites());
    const app = { namespace: 'default', resourceName: 'app1', name: 'App 1' };

    act(() => {
      result.current.addFavorite(app);
    });

    const exported = result.current.exportFavorites();
    expect(typeof exported).toBe('string');

    const parsed = JSON.parse(exported);
    expect(parsed.version).toBe(1);
    expect(parsed.favorites).toContain('default/app1');
  });

  test('importFavorites loads favorites from JSON', () => {
    const { result } = renderHook(() => useFavorites());
    const jsonData = JSON.stringify({
      version: 1,
      favorites: ['default/app1', 'default/app2']
    });

    let success;
    act(() => {
      success = result.current.importFavorites(jsonData);
    });

    expect(success).toBe(true);
    expect(result.current.favorites).toEqual(['default/app1', 'default/app2']);
  });

  test('importFavorites rejects invalid JSON', () => {
    const { result } = renderHook(() => useFavorites());
    const invalidJson = 'not valid json';

    let success;
    act(() => {
      success = result.current.importFavorites(invalidJson);
    });

    expect(success).toBe(false);
    expect(result.current.favorites).toEqual([]);
  });

  test('importFavorites rejects data without favorites array', () => {
    const { result } = renderHook(() => useFavorites());
    const invalidData = JSON.stringify({
      version: 1,
      notFavorites: []
    });

    let success;
    act(() => {
      success = result.current.importFavorites(invalidData);
    });

    expect(success).toBe(false);
  });

  test('importFavorites rejects favorites with non-string values', () => {
    const { result } = renderHook(() => useFavorites());
    const invalidData = JSON.stringify({
      version: 1,
      favorites: ['valid', 123, 'also-valid']
    });

    let success;
    act(() => {
      success = result.current.importFavorites(invalidData);
    });

    expect(success).toBe(false);
  });

  test('importFavorites sets default version if missing', () => {
    const { result } = renderHook(() => useFavorites());
    const dataWithoutVersion = JSON.stringify({
      favorites: ['default/app1']
    });

    let success;
    act(() => {
      success = result.current.importFavorites(dataWithoutVersion);
    });

    expect(success).toBe(true);
    expect(result.current.favorites).toEqual(['default/app1']);
  });

  test('handles null app in isFavorite', () => {
    const { result } = renderHook(() => useFavorites());
    expect(result.current.isFavorite(null)).toBe(false);
  });

  test('handles undefined app in toggleFavorite', () => {
    const { result } = renderHook(() => useFavorites());
    act(() => {
      result.current.toggleFavorite(undefined);
    });
    expect(result.current.favorites).toEqual([]);
  });

  test('handles multiple apps with same name in different namespaces', () => {
    const { result } = renderHook(() => useFavorites());
    const app1 = { namespace: 'prod', resourceName: 'app', name: 'App' };
    const app2 = { namespace: 'dev', resourceName: 'app', name: 'App' };

    act(() => {
      result.current.addFavorite(app1);
    });

    act(() => {
      result.current.addFavorite(app2);
    });

    expect(result.current.isFavorite(app1)).toBe(true);
    expect(result.current.isFavorite(app2)).toBe(true);
    expect(result.current.favorites).toEqual(['prod/app', 'dev/app']);
  });

  test('state persists across hook re-renders', () => {
    const { result, rerender } = renderHook(() => useFavorites());
    const app = { namespace: 'default', resourceName: 'app1', name: 'App 1' };

    act(() => {
      result.current.addFavorite(app);
    });

    // Re-render the hook
    rerender();

    // State should persist
    expect(result.current.isFavorite(app)).toBe(true);
    expect(result.current.favorites).toContain('default/app1');
  });

  describe('reorderFavorites', () => {
    test('reorders favorites by moving item forward', () => {
      const { result } = renderHook(() => useFavorites());
      const app1 = { namespace: 'default', resourceName: 'app1', name: 'App 1' };
      const app2 = { namespace: 'default', resourceName: 'app2', name: 'App 2' };
      const app3 = { namespace: 'default', resourceName: 'app3', name: 'App 3' };

      act(() => {
        result.current.addFavorite(app1);
        result.current.addFavorite(app2);
        result.current.addFavorite(app3);
      });

      expect(result.current.favorites).toEqual(['default/app1', 'default/app2', 'default/app3']);

      // Move first item to last position
      act(() => {
        result.current.reorderFavorites(0, 2);
      });

      expect(result.current.favorites).toEqual(['default/app2', 'default/app3', 'default/app1']);
    });

    test('reorders favorites by moving item backward', () => {
      const { result } = renderHook(() => useFavorites());
      const app1 = { namespace: 'default', resourceName: 'app1', name: 'App 1' };
      const app2 = { namespace: 'default', resourceName: 'app2', name: 'App 2' };
      const app3 = { namespace: 'default', resourceName: 'app3', name: 'App 3' };

      act(() => {
        result.current.addFavorite(app1);
        result.current.addFavorite(app2);
        result.current.addFavorite(app3);
      });

      expect(result.current.favorites).toEqual(['default/app1', 'default/app2', 'default/app3']);

      // Move last item to first position
      act(() => {
        result.current.reorderFavorites(2, 0);
      });

      expect(result.current.favorites).toEqual(['default/app3', 'default/app1', 'default/app2']);
    });

    test('reorders favorites by swapping adjacent items', () => {
      const { result } = renderHook(() => useFavorites());
      const app1 = { namespace: 'default', resourceName: 'app1', name: 'App 1' };
      const app2 = { namespace: 'default', resourceName: 'app2', name: 'App 2' };

      act(() => {
        result.current.addFavorite(app1);
        result.current.addFavorite(app2);
      });

      expect(result.current.favorites).toEqual(['default/app1', 'default/app2']);

      // Swap the two items
      act(() => {
        result.current.reorderFavorites(0, 1);
      });

      expect(result.current.favorites).toEqual(['default/app2', 'default/app1']);
    });

    test('does nothing when fromIndex equals toIndex', () => {
      const { result } = renderHook(() => useFavorites());
      const app1 = { namespace: 'default', resourceName: 'app1', name: 'App 1' };
      const app2 = { namespace: 'default', resourceName: 'app2', name: 'App 2' };

      act(() => {
        result.current.addFavorite(app1);
        result.current.addFavorite(app2);
      });

      const originalOrder = [...result.current.favorites];

      act(() => {
        result.current.reorderFavorites(1, 1);
      });

      expect(result.current.favorites).toEqual(originalOrder);
    });

    test('handles invalid indices gracefully', () => {
      const { result } = renderHook(() => useFavorites());
      const app1 = { namespace: 'default', resourceName: 'app1', name: 'App 1' };

      act(() => {
        result.current.addFavorite(app1);
      });

      const originalOrder = [...result.current.favorites];

      // Negative indices
      act(() => {
        result.current.reorderFavorites(-1, 0);
      });
      expect(result.current.favorites).toEqual(originalOrder);

      // Out of bounds indices
      act(() => {
        result.current.reorderFavorites(0, 10);
      });
      expect(result.current.favorites).toEqual(originalOrder);
    });

    test('persists reordered favorites to localStorage', () => {
      const { result } = renderHook(() => useFavorites());
      const app1 = { namespace: 'default', resourceName: 'app1', name: 'App 1' };
      const app2 = { namespace: 'default', resourceName: 'app2', name: 'App 2' };

      act(() => {
        result.current.addFavorite(app1);
        result.current.addFavorite(app2);
      });

      act(() => {
        result.current.reorderFavorites(0, 1);
      });

      // Check localStorage was updated
      const stored = localStorage.getItem('startpunkt:favorites');
      const parsed = JSON.parse(stored);
      expect(parsed.favorites).toEqual(['default/app2', 'default/app1']);
    });
  });
});
