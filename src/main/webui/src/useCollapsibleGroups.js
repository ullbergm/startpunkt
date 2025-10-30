import { useLocalStorage } from '@rehooks/local-storage';

/**
 * Custom hook to manage collapsed state of groups
 * @param {string} storageKey - Key to use for localStorage
 * @param {boolean} defaultCollapsed - Default collapsed state for new groups
 * @returns {Object} - Object with collapsedGroups, toggleGroup, expandAll, collapseAll functions
 */
export function useCollapsibleGroups(storageKey = 'collapsedGroups', defaultCollapsed = false) {
  const [collapsedGroups, setCollapsedGroups] = useLocalStorage(storageKey, {});

  const toggleGroup = (groupName) => {
    setCollapsedGroups(prev => ({
      ...prev,
      [groupName]: prev[groupName] === undefined ? !defaultCollapsed : !prev[groupName]
    }));
  };

  const expandAll = (groupNames) => {
    const newState = {};
    groupNames.forEach(name => {
      newState[name] = false;
    });
    setCollapsedGroups(newState);
  };

  const collapseAll = (groupNames) => {
    const newState = {};
    groupNames.forEach(name => {
      newState[name] = true;
    });
    setCollapsedGroups(newState);
  };

  const isCollapsed = (groupName) => {
    return collapsedGroups[groupName] === undefined ? defaultCollapsed : collapsedGroups[groupName];
  };

  return {
    collapsedGroups,
    toggleGroup,
    expandAll,
    collapseAll,
    isCollapsed
  };
}
