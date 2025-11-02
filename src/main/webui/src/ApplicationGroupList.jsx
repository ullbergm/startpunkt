import { useMemo } from 'preact/hooks';
import { ApplicationGroup } from './ApplicationGroup';
import { useCollapsibleGroups } from './useCollapsibleGroups';

export function ApplicationGroupList(props) {
  const { isCollapsed, toggleGroup } = useCollapsibleGroups('collapsedApplicationGroups');

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
        {Array.isArray(props.groups) && props.groups.map(group => (
          <ApplicationGroup 
            key={group.name} 
            group={group.name} 
            applications={group.applications} 
            layoutPrefs={props.layoutPrefs}
            isCollapsed={isCollapsed(group.name)}
            onToggle={groupHandlers[group.name]}
            onEditApp={props.onEditApp}
          />
        ))}
      </div>
    </div>
  );
}

export default ApplicationGroupList;
