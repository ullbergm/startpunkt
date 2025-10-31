import { useState, useCallback, useMemo, useEffect } from 'preact/hooks';

/**
 * Helper function to safely read from localStorage
 */
function readFromStorage(key) {
  try {
    const item = window.localStorage.getItem(key);
    if (!item) return [];
    
    const parsed = JSON.parse(item);
    
    // Migrate old object format {group1: true} to new array format ["group1"]
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return Object.keys(parsed).filter(k => parsed[k] === true);
    }
    
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error('Error reading from localStorage:', error);
    return [];
  }
}

/**
 * Helper function to safely write to localStorage
 */
function writeToStorage(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error('Error writing to localStorage:', error);
  }
}

/**
 * Custom hook to manage collapsed state of groups.
 * Only collapsed groups are stored in localStorage (expanded is the default state).
 * Uses a Set internally for O(1) lookup performance.
 * 
 * @param {string} storageKey - Key to use for localStorage
 * @returns {Object} - Object with toggleGroup and isCollapsed functions
 */
export function useCollapsibleGroups(storageKey = 'collapsedGroups') {
  // Initialize state from localStorage as an array
  const [collapsedGroups, setCollapsedGroups] = useState(() => readFromStorage(storageKey));

  // Convert array to Set for O(1) lookups
  const collapsedSet = useMemo(() => new Set(collapsedGroups), [collapsedGroups]);

  // Sync to localStorage whenever state changes
  useEffect(() => {
    writeToStorage(storageKey, collapsedGroups);
  }, [storageKey, collapsedGroups]);

  // Toggle a group's collapsed state
  const toggleGroup = useCallback((groupName) => {
    setCollapsedGroups(prev => {
      // For typical group counts, includes() is simpler and performs well
      const isCurrentlyCollapsed = prev.includes(groupName);
      
      // Toggle: add if not collapsed, remove if collapsed
      return isCurrentlyCollapsed
        ? prev.filter(name => name !== groupName)
        : [...prev, groupName];
    });
  }, []);

  // Check if a group is collapsed - O(1) lookup with Set
  const isCollapsed = useCallback((groupName) => {
    return collapsedSet.has(groupName);
  }, [collapsedSet]);

  return {
    toggleGroup,
    isCollapsed
  };
}
