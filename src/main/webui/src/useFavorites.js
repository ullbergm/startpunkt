import { useState, useEffect, useCallback } from 'preact/hooks';

/**
 * Custom hook for managing favorite applications with localStorage persistence
 *
 * Storage format:
 * {
 *   "version": 1,
 *   "favorites": ["app-id-1", "app-id-2", ...]
 * }
 *
 * Features:
 * - Persistent storage across sessions
 * - Cross-tab synchronization via storage events
 * - Export/import functionality
 * - Graceful degradation if localStorage unavailable
 */

const STORAGE_KEY = 'startpunkt:favorites';
const STORAGE_VERSION = 1;

const DEFAULT_FAVORITES = {
  version: STORAGE_VERSION,
  favorites: []
};

/**
 * Generate a unique ID for an application
 * Uses namespace, resourceName, and name as a composite key
 */
export function getApplicationId(app) {
  if (!app) return null;
  // Prefer namespace + resourceName (K8s unique identifier), fallback to name
  const namespace = app.namespace || 'default';
  const resourceName = app.resourceName || app.name;
  return `${namespace}/${resourceName}`;
}

/**
 * Load favorites from localStorage
 */
function loadFavorites() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return DEFAULT_FAVORITES;

    const data = JSON.parse(stored);
    // Validate structure
    if (!data || !Array.isArray(data.favorites)) {
      return DEFAULT_FAVORITES;
    }

    return data;
  } catch (error) {
    console.error('Failed to load favorites from localStorage:', error);
    return DEFAULT_FAVORITES;
  }
}

/**
 * Save favorites to localStorage
 */
function saveFavorites(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Failed to save favorites to localStorage:', error);
  }
}

export function useFavorites() {
  const [favoritesData, setFavoritesData] = useState(loadFavorites);

  // Save to localStorage whenever favorites change
  useEffect(() => {
    saveFavorites(favoritesData);
  }, [favoritesData]);

  // Ensure data structure is valid
  const favorites = favoritesData?.favorites || [];

  /**
   * Check if an application is favorited
   */
  const isFavorite = useCallback((app) => {
    if (!app) return false;
    const appId = getApplicationId(app);
    const currentFavorites = favoritesData?.favorites || [];
    return appId ? currentFavorites.includes(appId) : false;
  }, [favoritesData]);

  /**
   * Get the index of an application in the favorites list
   * Returns -1 if not favorited
   */
  const getFavoriteIndex = useCallback((app) => {
    if (!app) return -1;
    const appId = getApplicationId(app);
    const currentFavorites = favoritesData?.favorites || [];
    return appId ? currentFavorites.indexOf(appId) : -1;
  }, [favoritesData]);

  /**
   * Toggle favorite status for an application
   */
  const toggleFavorite = useCallback((app) => {
    if (!app) return;

    const appId = getApplicationId(app);
    if (!appId) return;

    setFavoritesData(prevData => {
      const prevFavorites = prevData?.favorites || [];
      const newFavorites = prevFavorites.includes(appId)
        ? prevFavorites.filter(id => id !== appId)
        : [...prevFavorites, appId];

      return {
        version: STORAGE_VERSION,
        favorites: newFavorites
      };
    });
  }, [setFavoritesData]);

  /**
   * Add an application to favorites
   */
  const addFavorite = useCallback((app) => {
    if (!app) return;

    const appId = getApplicationId(app);
    if (!appId) return;

    setFavoritesData(prevData => {
      const prevFavorites = prevData?.favorites || [];
      if (prevFavorites.includes(appId)) return prevData;

      return {
        version: STORAGE_VERSION,
        favorites: [...prevFavorites, appId]
      };
    });
  }, [setFavoritesData]);

  /**
   * Remove an application from favorites
   */
  const removeFavorite = useCallback((app) => {
    if (!app) return;

    const appId = getApplicationId(app);
    if (!appId) return;

    setFavoritesData(prevData => {
      const prevFavorites = prevData?.favorites || [];
      return {
        version: STORAGE_VERSION,
        favorites: prevFavorites.filter(id => id !== appId)
      };
    });
  }, [setFavoritesData]);

  /**
   * Clear all favorites
   */
  const clearFavorites = useCallback(() => {
    setFavoritesData(DEFAULT_FAVORITES);
  }, [setFavoritesData]);

  /**
   * Reorder favorites by moving an item from one index to another
   * @param {number} fromIndex - The current index of the favorite to move
   * @param {number} toIndex - The target index where the favorite should be moved
   */
  const reorderFavorites = useCallback((fromIndex, toIndex) => {
    if (fromIndex === toIndex) return;
    if (fromIndex < 0 || toIndex < 0) return;

    setFavoritesData(prevData => {
      const prevFavorites = prevData?.favorites || [];
      if (fromIndex >= prevFavorites.length || toIndex >= prevFavorites.length) return prevData;

      const newFavorites = [...prevFavorites];
      const [movedItem] = newFavorites.splice(fromIndex, 1);
      newFavorites.splice(toIndex, 0, movedItem);

      return {
        version: STORAGE_VERSION,
        favorites: newFavorites
      };
    });
  }, [setFavoritesData]);

  /**
   * Export favorites as JSON
   */
  const exportFavorites = useCallback(() => {
    return JSON.stringify(favoritesData, null, 2);
  }, [favoritesData]);

  /**
   * Import favorites from JSON
   * Returns true on success, false on failure
   */
  const importFavorites = useCallback((jsonString) => {
    try {
      const data = JSON.parse(jsonString);

      // Validate structure
      if (!data || typeof data !== 'object') {
        console.error('Invalid favorites data: not an object');
        return false;
      }

      if (!Array.isArray(data.favorites)) {
        console.error('Invalid favorites data: favorites is not an array');
        return false;
      }

      // Validate all favorites are strings
      if (!data.favorites.every(f => typeof f === 'string')) {
        console.error('Invalid favorites data: some favorites are not strings');
        return false;
      }

      // Set version if not present
      const importData = {
        version: data.version || STORAGE_VERSION,
        favorites: data.favorites
      };

      setFavoritesData(importData);
      return true;
    } catch (error) {
      console.error('Failed to import favorites:', error);
      return false;
    }
  }, [setFavoritesData]);

  /**
   * Listen for storage events to sync across tabs
   */
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === STORAGE_KEY) {
        if (e.newValue === null) {
          // Item was deleted from localStorage - reset to defaults
          setFavoritesData(DEFAULT_FAVORITES);
        } else {
          try {
            const newData = JSON.parse(e.newValue);
            setFavoritesData(newData);
          } catch (error) {
            console.error('Failed to parse favorites from storage event:', error);
          }
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [setFavoritesData]);

  return {
    favorites,
    isFavorite,
    getFavoriteIndex,
    toggleFavorite,
    addFavorite,
    removeFavorite,
    clearFavorites,
    reorderFavorites,
    exportFavorites,
    importFavorites
  };
}

export default useFavorites;
