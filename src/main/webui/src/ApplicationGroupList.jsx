import { useMemo } from 'preact/hooks';
import { ApplicationGroup } from './ApplicationGroup';
import { useCollapsibleGroups } from './useCollapsibleGroups';
import { useFavorites } from './useFavorites';

/**
 * Separate applications into favorites and regular groups
 */
function separateFavoritesFromGroups(groups, isFavorite) {
  if (!Array.isArray(groups)) {
    return { favoritesGroup: null, regularGroups: [] };
  }

  const favoriteApps = [];
  const newRegularGroups = groups.map(group => {
    const regularApps = [];
    
    if (Array.isArray(group.applications)) {
      group.applications.forEach(app => {
        if (isFavorite(app)) {
          favoriteApps.push(app);
        } else {
          regularApps.push(app);
        }
      });
    }

    return {
      ...group,
      applications: regularApps
    };
  }).filter(group => group.applications.length > 0); // Remove empty groups

  const favGroup = favoriteApps.length > 0 ? {
    name: null, // No heading for favorites
    applications: favoriteApps,
    isFavorites: true
  } : null;

  return {
    favoritesGroup: favGroup,
    regularGroups: newRegularGroups
  };
}

export function ApplicationGroupList(props) {
  const { isCollapsed, toggleGroup } = useCollapsibleGroups('collapsedApplicationGroups');
  const { isFavorite, toggleFavorite } = useFavorites();

  // Separate favorites from regular apps and create groups
  const { favoritesGroup, regularGroups } = useMemo(() => {
    return separateFavoritesFromGroups(props.groups, isFavorite);
  }, [props.groups, isFavorite]);

  // Memoize toggle handlers to prevent unnecessary re-renders
  const groupHandlers = useMemo(() => {
    if (!Array.isArray(props.groups)) return {};
    
    return props.groups.reduce((acc, group) => {
      acc[group.name] = () => toggleGroup(group.name);
      return acc;
    }, {});
  }, [props.groups, toggleGroup]);

  return (
    <div>
      <div class="container px-4" id="icon-grid">
        {/* Favorites section - no heading, appears at top */}
        {favoritesGroup && (
          <ApplicationGroup 
            key="favorites" 
            group={null}
            applications={favoritesGroup.applications} 
            layoutPrefs={props.layoutPrefs}
            isCollapsed={false}
            isFavorites={true}
            onToggle={null}
            onEditApp={props.onEditApp}
            isFavorite={isFavorite}
            onToggleFavorite={toggleFavorite}
          />
        )}

        {/* Regular groups */}
        {regularGroups.map(group => (
          <ApplicationGroup 
            key={group.name} 
            group={group.name} 
            applications={group.applications} 
            layoutPrefs={props.layoutPrefs}
            isCollapsed={isCollapsed(group.name)}
            isFavorites={false}
            onToggle={groupHandlers[group.name]}
            onEditApp={props.onEditApp}
            isFavorite={isFavorite}
            onToggleFavorite={toggleFavorite}
          />
        ))}
      </div>
    </div>
  );
}

export default ApplicationGroupList;
