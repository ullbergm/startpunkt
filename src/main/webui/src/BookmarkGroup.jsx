import { Bookmark } from './Bookmark';

export function BookmarkGroup(props) {
  const { layoutPrefs, isCollapsed, onToggle, onEditBookmark } = props;
  
  // Get CSS variables and grid template from layout preferences
  const cssVars = layoutPrefs ? layoutPrefs.getCSSVariables() : {};
  const gridTemplate = layoutPrefs ? layoutPrefs.getGridTemplateColumns() : 'repeat(5, 1fr)';
  
  // Determine padding class based on compact mode
  const paddingClass = layoutPrefs?.preferences.compactMode ? 'py-3' : 'py-5';
  
  // Use CSS Grid with responsive columns
  // The gridTemplateColumns will be overridden by CSS media queries for mobile
  const gridStyle = {
    display: 'grid',
    gridTemplateColumns: gridTemplate,
    gap: cssVars['--card-gap'] || '1rem',
    ...cssVars
  };

  const handleToggle = () => {
    if (onToggle) {
      onToggle();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleToggle();
    }
  };

  return (
    <div style={{ marginBottom: cssVars['--group-spacing'] || '3rem' }}>
      <h2 
        class="pb-2 border-bottom text-uppercase"
        style={{ cursor: 'pointer', userSelect: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        onClick={handleToggle}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        role="button"
        aria-expanded={!isCollapsed}
        aria-controls={`bookmark-group-${props.group.replace(/\s+/g, '-')}`}
        aria-label={`${isCollapsed ? 'Expand' : 'Collapse'} ${props.group} bookmark group`}
      >
        <span 
          style={{ fontSize: '0.8em', transition: 'transform 0.2s', transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)' }}
          aria-hidden="true"
        >
          ▼
        </span>
        {props.group}
      </h2>

      {!isCollapsed && (
        <div 
          class={`${paddingClass} bookmark-grid`}
          style={gridStyle}
          id={`bookmark-group-${props.group.replace(/\s+/g, '-')}`}
          role="list"
          aria-label={`${props.group} bookmarks`}
        >
          {Array.isArray(props.bookmarks) && props.bookmarks.map((bookmark) => (
            <div role="listitem" key={bookmark.name}>
              <Bookmark bookmark={bookmark} layoutPrefs={layoutPrefs} onEdit={onEditBookmark} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default BookmarkGroup;
