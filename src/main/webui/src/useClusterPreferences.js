import { useLocalStorage } from '@rehooks/local-storage';

/**
 * Custom hook for managing cluster filter preferences with localStorage persistence
 * 
 * Cluster preferences include:
 * - enabledClusters: object (key: cluster name, value: boolean)
 * 
 * When enabledClusters is empty or all are enabled, all applications are shown.
 * When specific clusters are disabled, applications from those clusters are filtered out.
 * 
 * @param {boolean} defaultShowAll - If false (default), only show local cluster by default; if true, show all clusters by default
 */

const DEFAULT_PREFERENCES = {
  enabledClusters: {} // Empty object means all clusters are enabled by default
};

export function useClusterPreferences(defaultShowAll = false) {
  const [preferences, setPreferences] = useLocalStorage(
    'startpunkt:cluster-preferences',
    DEFAULT_PREFERENCES
  );

  /**
   * Initialize cluster preferences when cluster list becomes available
   * This ensures clusters start with the configured default behavior
   * 
   * @param {Array<string>} clusterNames - Array of cluster names
   */
  const initializeClusters = (clusterNames) => {
    if (!clusterNames || clusterNames.length === 0) {
      return;
    }

    const currentEnabled = preferences.enabledClusters || {};
    const needsUpdate = clusterNames.some(name => !(name in currentEnabled));

    if (needsUpdate) {
      const newEnabled = { ...currentEnabled };
      clusterNames.forEach(name => {
        // Only set if not already present (preserves user choices)
        if (!(name in newEnabled)) {
          // If defaultShowAll is false, only enable 'local' cluster by default
          // If defaultShowAll is true, enable all clusters by default
          if (defaultShowAll) {
            newEnabled[name] = true;
          } else {
            newEnabled[name] = (name === 'local');
          }
        }
      });
      
      setPreferences({
        ...preferences,
        enabledClusters: newEnabled
      });
    }
  };

  /**
   * Toggle a specific cluster on or off
   * 
   * @param {string} clusterName - Name of the cluster to toggle
   */
  const toggleCluster = (clusterName) => {
    const currentEnabled = preferences.enabledClusters || {};
    const newEnabled = {
      ...currentEnabled,
      [clusterName]: !(currentEnabled[clusterName] ?? true)
    };

    setPreferences({
      ...preferences,
      enabledClusters: newEnabled
    });
  };

  /**
   * Set a specific cluster's enabled state
   * 
   * @param {string} clusterName - Name of the cluster
   * @param {boolean} enabled - Whether the cluster should be enabled
   */
  const setClusterEnabled = (clusterName, enabled) => {
    const currentEnabled = preferences.enabledClusters || {};
    const newEnabled = {
      ...currentEnabled,
      [clusterName]: enabled
    };

    setPreferences({
      ...preferences,
      enabledClusters: newEnabled
    });
  };

  /**
   * Enable all clusters
   */
  const enableAllClusters = () => {
    const currentEnabled = preferences.enabledClusters || {};
    const newEnabled = {};
    
    Object.keys(currentEnabled).forEach(name => {
      newEnabled[name] = true;
    });

    setPreferences({
      ...preferences,
      enabledClusters: newEnabled
    });
  };

  /**
   * Enable only a specific cluster (disable all others)
   * 
   * @param {string} clusterName - Name of the cluster to enable exclusively
   */
  const enableOnlyCluster = (clusterName) => {
    const currentEnabled = preferences.enabledClusters || {};
    const newEnabled = {};
    
    Object.keys(currentEnabled).forEach(name => {
      newEnabled[name] = (name === clusterName);
    });

    setPreferences({
      ...preferences,
      enabledClusters: newEnabled
    });
  };

  /**
   * Check if a specific cluster is enabled
   * 
   * @param {string} clusterName - Name of the cluster
   * @returns {boolean} - True if enabled (default: true if not in preferences)
   */
  const isClusterEnabled = (clusterName) => {
    const currentEnabled = preferences.enabledClusters || {};
    return currentEnabled[clusterName] ?? true; // Default to enabled
  };

  /**
   * Get list of enabled cluster names
   * 
   * @param {Array<string>} allClusters - Array of all available cluster names
   * @returns {Array<string>} - Array of enabled cluster names
   */
  const getEnabledClusters = (allClusters) => {
    if (!allClusters) return [];
    return allClusters.filter(name => isClusterEnabled(name));
  };

  /**
   * Get count of enabled clusters
   * 
   * @returns {number} - Number of enabled clusters
   */
  const getEnabledCount = () => {
    const currentEnabled = preferences.enabledClusters || {};
    return Object.values(currentEnabled).filter(Boolean).length;
  };

  /**
   * Check if all clusters are enabled
   * 
   * @param {Array<string>} allClusters - Array of all available cluster names
   * @returns {boolean} - True if all clusters are enabled
   */
  const areAllClustersEnabled = (allClusters) => {
    if (!allClusters || allClusters.length === 0) return true;
    return allClusters.every(name => isClusterEnabled(name));
  };

  /**
   * Filter applications based on enabled clusters
   * 
   * @param {Array} applications - Array of application objects
   * @returns {Array} - Filtered array of applications
   */
  const filterApplications = (applications) => {
    if (!applications) return [];
    
    const currentEnabled = preferences.enabledClusters || {};
    
    // If no preferences set or all are enabled, return all applications
    const hasDisabledClusters = Object.values(currentEnabled).some(enabled => !enabled);
    if (!hasDisabledClusters) {
      return applications;
    }

    // Filter out applications from disabled clusters
    return applications.filter(app => {
      const clusterName = app.cluster || 'local';
      return isClusterEnabled(clusterName);
    });
  };

  /**
   * Filter bookmarks based on enabled clusters
   * 
   * @param {Array} bookmarks - Array of bookmark objects
   * @returns {Array} - Filtered array of bookmarks
   */
  const filterBookmarks = (bookmarks) => {
    if (!bookmarks) return [];
    
    const currentEnabled = preferences.enabledClusters || {};
    
    // If no preferences set or all are enabled, return all bookmarks
    const hasDisabledClusters = Object.values(currentEnabled).some(enabled => !enabled);
    if (!hasDisabledClusters) {
      return bookmarks;
    }

    // Filter out bookmarks from disabled clusters
    return bookmarks.filter(bookmark => {
      const clusterName = bookmark.cluster || 'local';
      return isClusterEnabled(clusterName);
    });
  };

  return {
    preferences,
    initializeClusters,
    toggleCluster,
    setClusterEnabled,
    enableAllClusters,
    enableOnlyCluster,
    isClusterEnabled,
    getEnabledClusters,
    getEnabledCount,
    areAllClustersEnabled,
    filterApplications,
    filterBookmarks
  };
}

export default useClusterPreferences;
