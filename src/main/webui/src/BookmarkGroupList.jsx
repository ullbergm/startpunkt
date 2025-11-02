import { useMemo } from 'preact/hooks';
import { BookmarkGroup } from './BookmarkGroup';
import { useCollapsibleGroups } from './useCollapsibleGroups';

export function BookmarkGroupList(props) {
  const { isCollapsed, toggleGroup } = useCollapsibleGroups('collapsedBookmarkGroups');

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
          <BookmarkGroup 
            key={group.name} 
            group={group.name} 
            bookmarks={group.bookmarks} 
            layoutPrefs={props.layoutPrefs}
            isCollapsed={isCollapsed(group.name)}
            onToggle={groupHandlers[group.name]}
          />
        ))}
      </div>
    </div>
  );
}

export default BookmarkGroupList;
