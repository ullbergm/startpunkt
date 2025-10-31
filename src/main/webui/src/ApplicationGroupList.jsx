import { ApplicationGroup } from './ApplicationGroup';
import { useCollapsibleGroups } from './useCollapsibleGroups';

export function ApplicationGroupList(props) {
  const { isCollapsed, toggleGroup } = useCollapsibleGroups('collapsedApplicationGroups', false);

  return (
    <div>
      <div class="container px-4 py-5" id="icon-grid">
        {Array.isArray(props.groups) && props.groups.map(group => (
          <ApplicationGroup 
            key={group.name} 
            group={group.name} 
            applications={group.applications} 
            layoutPrefs={props.layoutPrefs}
            isCollapsed={isCollapsed(group.name)}
            onToggle={() => toggleGroup(group.name)}
          />
        ))}
      </div>
    </div>
  );
}

export default ApplicationGroupList;
