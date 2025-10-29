import { Application } from './Application';

export function ApplicationGroup(props) {
  const { layoutPrefs } = props;
  
  // Get CSS variables and grid template from layout preferences
  const cssVars = layoutPrefs ? layoutPrefs.getCSSVariables() : {};
  const gridTemplate = layoutPrefs ? layoutPrefs.getGridTemplateColumns() : 'repeat(auto-fill, minmax(280px, 1fr))';
  
  // Determine grid gap class based on spacing preference
  const gapClass = layoutPrefs?.preferences.spacing === 'tight' ? 'g-2' : 
                   layoutPrefs?.preferences.spacing === 'relaxed' ? 'g-5' : 'g-4';
  
  // Determine padding class based on compact mode
  const paddingClass = layoutPrefs?.preferences.compactMode ? 'py-3' : 'py-5';
  
  // Use CSS Grid with dynamic columns instead of Bootstrap's row-cols
  const gridStyle = {
    display: 'grid',
    gridTemplateColumns: gridTemplate,
    gap: cssVars['--card-gap'] || '1rem',
    ...cssVars
  };

  return (
    <div style={{ marginBottom: cssVars['--group-spacing'] || '3rem' }}>
      <h2 class="pb-2 border-bottom text-uppercase">{props.group}</h2>

      <div class={paddingClass} style={gridStyle}>
        {Array.isArray(props.applications) && props.applications.map((app) => (
          <Application key={app.name} app={app} layoutPrefs={layoutPrefs} />
        ))}
      </div>
    </div>
  );
}

export default ApplicationGroup;