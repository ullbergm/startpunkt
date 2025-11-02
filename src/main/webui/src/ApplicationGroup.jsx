import { Application } from './Application';

export function ApplicationGroup(props) {
  const { layoutPrefs, isCollapsed, onToggle } = props;
  
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
          class={`${paddingClass} application-grid`}
          style={gridStyle}
          id={`group-${props.group.replace(/\s+/g, '-')}`}
          role="list"
          aria-label={`${props.group} applications`}
        >
          {Array.isArray(props.applications) && props.applications.map((app) => (
            <div role="listitem" key={app.name}>
              <Application app={app} layoutPrefs={layoutPrefs} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default ApplicationGroup;