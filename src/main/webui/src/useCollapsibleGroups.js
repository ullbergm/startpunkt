import { useState, useEffect } from 'preact/hooks';

/**
 * Custom hook to manage collapsed state of groups
 * @param {string} storageKey - Key to use for localStorage
 * @param {boolean} defaultCollapsed - Default collapsed state for new groups
 * @returns {Object} - Object with collapsedGroups, toggleGroup, and isCollapsed functions
 */
export function useCollapsibleGroups(storageKey = 'collapsedGroups', defaultCollapsed = false) {
  // Initialize state from localStorage
  const [collapsedGroups, setCollapsedGroupsState] = useState(() => {
    try {
      const item = window.localStorage.getItem(storageKey);
      return item ? JSON.parse(item) : {};
    } catch (error) {
      console.error('Error reading from localStorage:', error);
      return {};
    }
  });

  // Wrapper to update both state and localStorage
  const setCollapsedGroups = (updater) => {
    setCollapsedGroupsState(prev => {
      const newState = typeof updater === 'function' ? updater(prev) : updater;
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(newState));
      } catch (error) {
        console.error('Error writing to localStorage:', error);
      }
      return newState;
    });
  };

  const toggleGroup = (groupName) => {
    setCollapsedGroups(prev => {
      const currentState = prev || {};
      const isCurrentlyCollapsed = currentState[groupName] === undefined ? defaultCollapsed : currentState[groupName];
      const newCollapsedState = !isCurrentlyCollapsed;
      
      // Only store collapsed groups; remove from storage when expanded
      if (newCollapsedState) {
        return {
          ...currentState,
          [groupName]: true
        };
      } else {
        const { [groupName]: _, ...rest } = currentState;
        return rest;
      }
    });
  };

  const isCollapsed = (groupName) => {
    return collapsedGroups[groupName] === undefined ? defaultCollapsed : collapsedGroups[groupName];
  };

  return {
    collapsedGroups,
    toggleGroup,
    isCollapsed
  };
}
