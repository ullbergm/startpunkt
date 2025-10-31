import { useState, useCallback, useMemo } from 'preact/hooks';

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
  const [collapsedGroups, setCollapsedGroups] = useState(() => {
    try {
      const item = window.localStorage.getItem(storageKey);
      if (!item) return [];
      
      const parsed = JSON.parse(item);
      
      // Migrate old object format {group1: true} to new array format ["group1"]
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        const migratedArray = Object.keys(parsed).filter(key => parsed[key] === true);
        // Save migrated format back to localStorage
        window.localStorage.setItem(storageKey, JSON.stringify(migratedArray));
        return migratedArray;
      }
      
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.error('Error reading from localStorage:', error);
      return [];
    }
  });

  // Convert array to Set for O(1) lookups
  const collapsedSet = useMemo(() => new Set(collapsedGroups), [collapsedGroups]);

  // Toggle a group's collapsed state
  const toggleGroup = useCallback((groupName) => {
    setCollapsedGroups(prev => {
      const isCurrentlyCollapsed = prev.includes(groupName);
      let newState;
      
      if (isCurrentlyCollapsed) {
        // Expanding: remove from list
        newState = prev.filter(name => name !== groupName);
      } else {
        // Collapsing: add to list
        newState = [...prev, groupName];
      }
      
      // Save to localStorage
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(newState));
      } catch (error) {
        console.error('Error writing to localStorage:', error);
      }
      
      return newState;
    });
  }, [storageKey]);

  // Check if a group is collapsed - O(1) lookup with Set
  const isCollapsed = useCallback((groupName) => {
    return collapsedSet.has(groupName);
  }, [collapsedSet]);

  return {
    toggleGroup,
    isCollapsed
  };
}
