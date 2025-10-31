import { useState, useCallback } from 'preact/hooks';

/**
 * Custom hook to manage collapsed state of groups.
 * Only collapsed groups are stored in localStorage (expanded is the default state).
 * 
 * @param {string} storageKey - Key to use for localStorage
 * @returns {Object} - Object with toggleGroup and isCollapsed functions
 */
export function useCollapsibleGroups(storageKey = 'collapsedGroups') {
  // Initialize state from localStorage
  const [collapsedGroups, setCollapsedGroups] = useState(() => {
    try {
      const item = window.localStorage.getItem(storageKey);
      return item ? JSON.parse(item) : [];
    } catch (error) {
      console.error('Error reading from localStorage:', error);
      return [];
    }
  });

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

  // Check if a group is collapsed
  const isCollapsed = useCallback((groupName) => {
    return collapsedGroups.includes(groupName);
  }, [collapsedGroups]);

  return {
    toggleGroup,
    isCollapsed
  };
}
