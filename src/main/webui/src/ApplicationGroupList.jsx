import { ApplicationGroup } from './ApplicationGroup';
import { useCollapsibleGroups } from './useCollapsibleGroups';

export function ApplicationGroupList(props) {
  const groupNames = Array.isArray(props.groups) ? props.groups.map(g => g.name) : [];
  const { isCollapsed, toggleGroup, expandAll, collapseAll } = useCollapsibleGroups('collapsedApplicationGroups', false);

  const hasGroups = groupNames.length > 0;

  return (
    <div>
      {hasGroups && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginBottom: '1rem' }}>
          <button 
            class="btn btn-sm btn-outline-secondary" 
            onClick={() => expandAll(groupNames)}
            aria-label="Expand all groups"
          >
            Expand All
          </button>
          <button 
            class="btn btn-sm btn-outline-secondary" 
            onClick={() => collapseAll(groupNames)}
            aria-label="Collapse all groups"
          >
            Collapse All
          </button>
        </div>
      )}
      <div class="container px-4 py-5" id="icon-grid">
        {Array.isArray(props.groups) && props.groups.map(group => (
          <ApplicationGroup 
            key={group.name} 
            group={group.name} 
            applications={group.applications} 
            layoutPrefs={props.layoutPrefs}
            previewConfig={props.previewConfig}
            isCollapsed={isCollapsed(group.name)}
            onToggle={() => toggleGroup(group.name)}
          />
        ))}
      </div>
    </div>
  );
}

export default ApplicationGroupList;
