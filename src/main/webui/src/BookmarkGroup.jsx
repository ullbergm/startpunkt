import { Bookmark } from './Bookmark';

export function BookmarkGroup(props) {
  const { layoutPrefs, isCollapsed, onToggle } = props;
  
  // Get CSS variables and grid template from layout preferences
  const cssVars = layoutPrefs ? layoutPrefs.getCSSVariables() : {};
  const gridTemplate = layoutPrefs ? layoutPrefs.getGridTemplateColumns() : 'repeat(auto-fill, minmax(280px, 1fr))';
  
  // Determine padding class based on compact mode
  const paddingClass = layoutPrefs?.preferences.compactMode ? 'py-3' : 'py-5';
  
  // Use CSS Grid with dynamic columns instead of Bootstrap's row-cols
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
      >
        <span style={{ fontSize: '0.8em', transition: 'transform 0.2s', transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)' }}>
          ▼
        </span>
        {props.group}
      </h2>

      {!isCollapsed && (
        <div class={paddingClass} style={gridStyle}>
          {Array.isArray(props.bookmarks) && props.bookmarks.map((bookmark) => (
            <Bookmark key={bookmark.name} bookmark={bookmark} layoutPrefs={layoutPrefs} />
          ))}
        </div>
      )}
    </div>
  );
}

export default BookmarkGroup;
