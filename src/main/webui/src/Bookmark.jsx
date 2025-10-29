import { Icon } from '@iconify/react';

export function Bookmark(props) {
  const { layoutPrefs } = props;
  
  // Get preferences with defaults
  const viewMode = layoutPrefs?.preferences.viewMode || 'grid';
  const showDescription = layoutPrefs?.preferences.showDescription !== false;
  const iconSize = layoutPrefs?.getCSSVariables()['--card-icon-size']?.replace('px', '') || '48';
  const fontSize = layoutPrefs?.getCSSVariables()['--card-font-size'] || '1rem';
  const padding = layoutPrefs?.getCSSVariables()['--card-padding'] || '1rem';
  
  // Build container style
  const containerStyle = {
    transform: 'rotate(0)',
    padding: padding
  };
  
  const renderIcon = (icon, name, size) => {
    if (!icon) return null;
    if (icon.includes('://')) {
      return (
        <img
          src={icon}
          alt={name}
          class="me-3"
          width={size}
          height={size}
        />
      );
    }
    const iconValue = !icon.includes(':') ? `mdi:${icon}` : icon;
    return (
      <Icon
        icon={iconValue}
        class="me-3 fs-2 text-primary"
        width={size}
        height={size}
      />
    );
  };
  
  // List view - compact horizontal layout
  if (viewMode === 'list') {
    return (
      <div class="d-flex align-items-start" style={containerStyle}>
        <a
          href={props.bookmark.url}
          target={props.bookmark.targetBlank ? '_blank' : '_self'}
          class="stretched-link"
          rel="external noopener noreferrer"
          aria-label={props.bookmark.name}
        />
        {renderIcon(props.bookmark.icon, props.bookmark.name, iconSize)}
        <div class="d-flex align-items-center flex-grow-1">
          <div>
            <h3 class="fw-normal mb-0 text-body-emphasis text-uppercase" style={{ fontSize }}>
              {props.bookmark.name}
            </h3>
          </div>
        </div>
      </div>
    );
  }
  
  // Grid view - standard card layout
  return (
    <div class="d-flex align-items-start" style={containerStyle}>
      <a
        href={props.bookmark.url}
        target={props.bookmark.targetBlank ? '_blank' : '_self'}
        class="stretched-link"
        rel="external noopener noreferrer"
        aria-label={props.bookmark.name}
      />
      {renderIcon(props.bookmark.icon, props.bookmark.name, iconSize)}
      <div class="px-2">
        <h3 class="fw-normal mb-0 text-body-emphasis text-uppercase" style={{ fontSize }}>
          {props.bookmark.name}
        </h3>
        {showDescription && props.bookmark.info && (
          <p class="accent text-uppercase" style={{ marginBottom: 0 }}>{props.bookmark.info}</p>
        )}
      </div>
    </div>
  );
}

export default Bookmark;
