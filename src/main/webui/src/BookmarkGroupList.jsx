import { BookmarkGroup } from './BookmarkGroup';
import { useCollapsibleGroups } from './useCollapsibleGroups';

export function BookmarkGroupList(props) {
  const { isCollapsed, toggleGroup } = useCollapsibleGroups('collapsedBookmarkGroups');

  return (
    <div>
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
