import { Icon } from '@iconify/react';

function renderIcon(icon, iconColor, name, isUnavailable, size = '48') {
  const opacity = isUnavailable ? 0.4 : 1;
  if (!icon) return null;
  if (icon.includes('://')) {
    return <img src={icon} alt={name} class="me-3" width={size} height={size} style={{ color: iconColor, opacity }} />;
  }
  if (!icon.includes(':')) {
    icon = `mdi:${icon}`;
  }
  return <Icon icon={icon} class="me-3 fs-2 text-primary" width={size} height={size} color={iconColor} style={{ opacity }} />;
}

export function Application(props) {
  const { layoutPrefs } = props;
  const isUnavailable = props.app.available === false;
  
  // Get preferences with defaults
  const showDescription = layoutPrefs?.preferences.showDescription !== false;
  const showTags = layoutPrefs?.preferences.showTags !== false;
  const showStatus = layoutPrefs?.preferences.showStatus !== false;
  const iconSize = layoutPrefs?.getCSSVariables()['--card-icon-size']?.replace('px', '') || '48';
  const fontSize = layoutPrefs?.getCSSVariables()['--card-font-size'] || '1rem';
  const padding = layoutPrefs?.getCSSVariables()['--card-padding'] || '1rem';
  
  // Parse tags from comma-separated string
  const tags = props.app.tags 
    ? props.app.tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0)
    : [];
  
  // Build container classes and styles
  const containerClass = `d-flex align-items-start${isUnavailable ? ' unavailable' : ''}`;
  const containerStyle = {
    transform: 'rotate(0)',
    padding: padding,
    ...(isUnavailable && { opacity: '0.5', cursor: 'not-allowed' })
  };
  
  // Standard card layout
  return (
    <div class={containerClass} style={containerStyle}>
      {!isUnavailable && (
        <a
          href={props.app.url}
          target={props.app.targetBlank ? '_blank' : '_self'}
          class="stretched-link"
          rel="external noopener noreferrer"
          aria-label={props.app.name}
        />
      )}
      {renderIcon(props.app.icon, props.app.iconColor, props.app.name, isUnavailable, iconSize)}
      <div class="px-2">
        <h3 class="fw-normal mb-0 text-body-emphasis text-uppercase" style={{ fontSize }}>
          {props.app.name}
        </h3>
        {showDescription && props.app.info && (
          <p class="accent text-uppercase" style={{ marginBottom: 0 }}>{props.app.info}</p>
        )}
        {showTags && tags.length > 0 && (
          <div class="mt-1" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
            {tags.map((tag) => (
              <span key={tag} class="badge bg-secondary" style={{ fontSize: '0.65rem' }}>
                {tag}
              </span>
            ))}
          </div>
        )}
        {showStatus && isUnavailable && (
          <span class="badge bg-warning text-dark mt-1" style={{ fontSize: '0.7rem' }}>Unavailable</span>
        )}
      </div>
    </div>
  );
}

export default Application;
