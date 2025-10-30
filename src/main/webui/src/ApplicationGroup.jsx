import { useState } from 'preact/hooks';
import Application from './Application';
import ApplicationPreview from './ApplicationPreview';

/**
 * Renders a single application card within a list item container.
 * The hover handlers are on the list item to prevent premature exit.
 */
function ApplicationListItem({ app, layoutPrefs, previewConfig }) {
  const [isHovering, setIsHovering] = useState(false);
  const isUnavailable = app.available === false;
  
  const previewEnabled = previewConfig?.enabled !== false;
  const previewDelay = previewConfig?.delay || 5000;

  const handleMouseEnter = () => {
    if (!isUnavailable) {
      setIsHovering(true);
    }
  };

  const handleMouseLeave = () => {
    setIsHovering(false);
  };

  return (
    <div 
      role="listitem" 
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <Application app={app} layoutPrefs={layoutPrefs} isHovering={isHovering} />
      <ApplicationPreview 
        url={app.url}
        name={app.name}
        isHovering={isHovering}
        enabled={previewEnabled && !isUnavailable}
        delay={previewDelay}
      />
    </div>
  );
}

export function ApplicationGroup(props) {
  const { layoutPrefs, previewConfig, isCollapsed, onToggle } = props;
  
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
      <h3 
        class="pb-2 border-bottom text-uppercase" 
        style={{ cursor: 'pointer', userSelect: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        onClick={handleToggle}
        tabIndex={0}
        onKeyDown={handleKeyDown}
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

      {!isCollapsed && (
        <div 
          class={paddingClass} 
          style={gridStyle}
          id={`group-${props.group.replace(/\s+/g, '-')}`}
          role="list"
          aria-label={`${props.group} applications`}
        >
          {Array.isArray(props.applications) && props.applications.map((app) => (
            <ApplicationListItem 
              key={app.name}
              app={app} 
              layoutPrefs={layoutPrefs} 
              previewConfig={previewConfig}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default ApplicationGroup;