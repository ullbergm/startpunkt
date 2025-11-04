import { useState } from 'preact/hooks';
import { Application } from './Application';

export function ApplicationGroup(props) {
  const { layoutPrefs, isCollapsed, onToggle, onEditApp, isFavorite, onToggleFavorite, isFavorites, onReorderFavorites, skeleton } = props;
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  
  // Get CSS variables and grid template from layout preferences
  const cssVars = layoutPrefs ? layoutPrefs.getCSSVariables() : {};
  const configuredColumnCount = layoutPrefs?.preferences.columnCount || 5;
  
  // For favorites, use the number of favorites as column count (capped at configured max)
  const favoriteCount = isFavorites ? (props.applications?.length || 0) : 0;
  const effectiveColumnCount = isFavorites 
    ? Math.min(favoriteCount, configuredColumnCount)
    : configuredColumnCount;
  
  const gridTemplate = `repeat(${effectiveColumnCount}, 1fr)`;
  
  // Determine padding class based on compact mode
  const paddingClass = layoutPrefs?.preferences.compactMode ? 'py-3' : 'py-5';
  
  // Use CSS Grid with responsive columns
  // The gridTemplateColumns will be overridden by CSS media queries for mobile
  // For favorites, center the grid and ensure items look normal
  const gridStyle = {
    display: 'grid',
    gridTemplateColumns: gridTemplate,
    gap: cssVars['--card-gap'] || '1rem',
    justifyContent: isFavorites ? 'center' : 'start',
    ...cssVars
  };

  // Skeleton mode rendering
  if (skeleton) {
    const showHeading = props.group !== null && !isFavorites;
    
    return (
      <div style={{ marginBottom: cssVars['--group-spacing'] || '3rem' }}>
        {showHeading && (
          <h3 
            class="pb-2 border-bottom text-uppercase" 
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <span 
              style={{ fontSize: '0.8em' }}
              aria-hidden="true"
            >
              ▼
            </span>
            <span 
              style={{ 
                width: '150px', 
                height: '1.75rem',
                backgroundColor: 'rgba(128, 128, 128, 0.3)',
                borderRadius: '4px',
                display: 'inline-block'
              }}
              class="skeleton-pulse"
            />
          </h3>
        )}

        <div 
          class={`${paddingClass} application-grid`}
          style={gridStyle}
          role="list"
          aria-label={isFavorites ? 'Loading favorite applications' : `Loading ${props.group} applications`}
        >
          {Array.isArray(props.applications) && props.applications.map((app, index) => (
            <div role="listitem" key={`skeleton-${index}`}>
              <Application 
                app={app} 
                layoutPrefs={layoutPrefs}
                skeleton={true}
              />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const handleToggle = () => {
    if (onToggle) {
      onToggle();
    }
  };

  const handleToggleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleToggle();
    }
  };

  // For favorites group, don't show heading
  const showHeading = props.group !== null && !isFavorites;

  // Check if drag and drop is enabled (only for favorites in edit mode)
  const isDragEnabled = isFavorites && layoutPrefs?.preferences.editMode && onReorderFavorites;

  // Drag and drop handlers
  const handleDragStart = (e, index) => {
    if (!isDragEnabled) return;
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.currentTarget);
    // Add a slight opacity to the dragged element
    e.currentTarget.style.opacity = '0.5';
  };

  const handleDragEnd = (e) => {
    if (!isDragEnabled) return;
    e.currentTarget.style.opacity = '1';
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragOver = (e, index) => {
    if (!isDragEnabled) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    if (draggedIndex !== null && draggedIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragLeave = (e) => {
    if (!isDragEnabled) return;
    // Only clear if we're leaving the listitem container
    if (e.currentTarget === e.target) {
      setDragOverIndex(null);
    }
  };

  const handleDrop = (e, dropIndex) => {
    if (!isDragEnabled) return;
    e.preventDefault();
    e.stopPropagation();
    
    if (draggedIndex !== null && draggedIndex !== dropIndex) {
      onReorderFavorites(draggedIndex, dropIndex);
    }
    
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  // Keyboard support for reordering (Alt+Arrow keys)
  const handleKeyDown = (e, index) => {
    if (!isDragEnabled) return;
    
    const totalItems = props.applications?.length || 0;
    if (totalItems <= 1) return;
    
    // Alt + Arrow Up: Move item up (swap with previous)
    if (e.altKey && e.key === 'ArrowUp' && index > 0) {
      e.preventDefault();
      onReorderFavorites(index, index - 1);
      // Focus will naturally move with the item
      setTimeout(() => {
        const container = e.currentTarget.parentElement;
        const items = container.querySelectorAll('[role="listitem"]');
        if (items[index - 1]) {
          items[index - 1].focus();
        }
      }, 50);
    }
    
    // Alt + Arrow Down: Move item down (swap with next)
    if (e.altKey && e.key === 'ArrowDown' && index < totalItems - 1) {
      e.preventDefault();
      onReorderFavorites(index, index + 1);
      // Focus will naturally move with the item
      setTimeout(() => {
        const container = e.currentTarget.parentElement;
        const items = container.querySelectorAll('[role="listitem"]');
        if (items[index + 1]) {
          items[index + 1].focus();
        }
      }, 50);
    }
  };

  return (
    <div style={{ marginBottom: cssVars['--group-spacing'] || '3rem' }}>
      {showHeading && (
        <h3 
          class="pb-2 border-bottom text-uppercase" 
          style={{ cursor: 'pointer', userSelect: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          onClick={handleToggle}
          tabIndex={0}
          onKeyDown={handleToggleKeyDown}
          role="button"
          aria-expanded={!isCollapsed}
          aria-controls={`group-${props.group.replace(/\s+/g, '-')}`}
          aria-label={`${isCollapsed ? 'Expand' : 'Collapse'} ${props.group} group`}
        >
          <span 
            style={{ fontSize: '0.8em', transition: 'transform 0.2s', transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)' }}
            aria-hidden="true"
          >
            ▼
          </span>
          {props.group}
        </h3>
      )}

      {!isCollapsed && (
        <div 
          class={`${paddingClass} application-grid`}
          style={gridStyle}
          id={isFavorites ? 'favorites' : `group-${props.group?.replace(/\s+/g, '-') || 'default'}`}
          role="list"
          aria-label={isFavorites ? 'Favorite applications' : `${props.group} applications`}
        >
          {Array.isArray(props.applications) && props.applications.map((app, index) => {
            const isDragging = draggedIndex === index;
            const isDropTarget = dragOverIndex === index;
            
            return (
              <div 
                role="listitem" 
                key={app.name}
                draggable={isDragEnabled}
                tabIndex={isDragEnabled ? 0 : -1}
                onDragStart={(e) => handleDragStart(e, index)}
                onDragEnd={handleDragEnd}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, index)}
                onKeyDown={(e) => handleKeyDown(e, index)}
                style={{
                  cursor: isDragEnabled ? 'move' : 'default',
                  opacity: isDragging ? 0.5 : 1,
                  transform: isDropTarget && draggedIndex !== null ? 'scale(1.05)' : 'scale(1)',
                  transition: 'transform 0.2s ease, opacity 0.2s ease',
                  border: isDropTarget && draggedIndex !== null ? '2px dashed #0d6efd' : 'none',
                  borderRadius: '8px',
                  padding: isDropTarget && draggedIndex !== null ? '2px' : '0'
                }}
                aria-grabbed={isDragEnabled && isDragging}
                aria-label={isDragEnabled ? `${app.name} (${index + 1} of ${props.applications.length}). Press Alt+Up or Alt+Down to reorder` : app.name}
              >
                <Application 
                  app={app} 
                  layoutPrefs={layoutPrefs} 
                  onEdit={onEditApp}
                  isFavorite={isFavorite ? isFavorite(app) : false}
                  onToggleFavorite={onToggleFavorite}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default ApplicationGroup;