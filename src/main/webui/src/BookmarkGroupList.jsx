import { BookmarkGroup } from './BookmarkGroup';
import { useCollapsibleGroups } from './useCollapsibleGroups';

export function BookmarkGroupList(props) {
  const groupNames = Array.isArray(props.groups) ? props.groups.map(g => g.name) : [];
  const { isCollapsed, toggleGroup, expandAll, collapseAll } = useCollapsibleGroups('collapsedBookmarkGroups', false);

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
          <BookmarkGroup 
            key={group.name} 
            group={group.name} 
            bookmarks={group.bookmarks} 
            layoutPrefs={props.layoutPrefs}
            isCollapsed={isCollapsed(group.name)}
            onToggle={() => toggleGroup(group.name)}
          />
        ))}
      </div>
    </div>
  );
}

export default BookmarkGroupList;
