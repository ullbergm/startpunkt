import { Icon } from '@iconify/react';
import { Text } from 'preact-i18n';

function renderIcon(icon, iconColor, name, isUnavailable, size = '48') {
  const opacity = isUnavailable ? 0.4 : 1;
  const iconStyle = {
    opacity,
    minWidth: `${size}px`,
    minHeight: `${size}px`,
    maxWidth: `${size}px`,
    maxHeight: `${size}px`,
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  };
  
  if (!icon) return null;
  if (icon.includes('://')) {
    return (
      <div class="me-1" style={iconStyle}>
        <img src={icon} alt={name} width={size} height={size} style={{ color: iconColor, opacity, display: 'block', objectFit: 'contain' }} />
      </div>
    );
  }
  if (!icon.includes(':')) {
    icon = `mdi:${icon}`;
  }
  return (
    <div class="me-1" style={iconStyle}>
      <Icon icon={icon} class="fs-2 text-primary" width={size} height={size} color={iconColor} style={{ opacity, display: 'block' }} />
    </div>
  );
}

export function Application(props) {
  const { layoutPrefs, onEdit, isFavorite, onToggleFavorite } = props;
  const isUnavailable = props.app.available === false;
  const isEditable = !props.app.hasOwnerReferences;
  const editMode = layoutPrefs?.preferences.editMode;
  
  // Get preferences with defaults
  const showDescription = layoutPrefs?.preferences.showDescription !== false;
  const showTags = layoutPrefs?.preferences.showTags !== false;
  const showStatus = layoutPrefs?.preferences.showStatus !== false;
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
    ...(isUnavailable && { opacity: '0.5', cursor: 'not-allowed' }),
    ...(editMode && isEditable && { 
      outline: '2px solid rgba(13, 110, 253, 0.5)',
      outlineOffset: '2px',
      borderRadius: '4px',
      backgroundColor: 'rgba(13, 110, 253, 0.05)',
      cursor: 'pointer'
    }),
    ...(editMode && !isEditable && { 
      opacity: '0.6'
    }),
    position: 'relative'
  };
  
  const handleClick = (e) => {
    if (editMode && isEditable && onEdit) {
      e.preventDefault();
      e.stopPropagation();
      onEdit(props.app);
    }
  };
  
  const handleToggleFavorite = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (onToggleFavorite) {
      onToggleFavorite(props.app);
    }
  };
  
  // Standard card layout
  return (
    <div 
      class={containerClass} 
      style={containerStyle}
      onClick={handleClick}
      role="article" 
      aria-label={`Application: ${props.app.name}${editMode && isEditable ? ' (click to edit)' : ''}${editMode && !isEditable ? ' (cannot edit - managed externally)' : ''}`}
    >
      {!isUnavailable && !editMode && (
        <a
          href={props.app.url}
          target={props.app.targetBlank ? '_blank' : '_self'}
          class="stretched-link"
          rel="external noopener noreferrer"
          aria-label={`${props.app.name}${props.app.info ? ` - ${props.app.info}` : ''}`}
        />
      )}
      {renderIcon(props.app.icon, props.app.iconColor, props.app.name, isUnavailable)}
      <div class="px-2" style={{ fontSize: '0.875rem', flexGrow: 1 }}>
        <h4 class="fw-normal mb-0 text-body-emphasis text-uppercase">
          {props.app.name}
        </h4>
        {showDescription && props.app.info && (
          <p class="accent text-uppercase" style={{ marginBottom: 0 }}>{props.app.info}</p>
        )}
        {showTags && tags.length > 0 && (
          <div class="mt-1" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }} role="list" aria-label="Tags">
            {tags.map((tag) => (
              <span key={tag} class="badge bg-secondary" style={{ fontSize: '0.65rem' }} role="listitem">
                {tag}
              </span>
            ))}
          </div>
        )}
        {showStatus && isUnavailable && (
          <span class="badge bg-warning text-dark mt-1" style={{ fontSize: '0.7rem' }} role="status">Unavailable</span>
        )}
      </div>
      {editMode && onToggleFavorite && (
        <button
          onClick={handleToggleFavorite}
          class="btn btn-sm btn-link ms-2"
          style={{ 
            position: 'relative', 
            zIndex: 10, 
            flexShrink: 0, 
            padding: '0.25rem 0.5rem',
            color: isFavorite ? '#ffc107' : '#6c757d'
          }}
          aria-label={isFavorite ? `Remove ${props.app.name} from favorites` : `Add ${props.app.name} to favorites`}
          aria-pressed={isFavorite}
          title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
        >
          <Icon icon={isFavorite ? 'mdi:star' : 'mdi:star-outline'} width="20" height="20" />
        </button>
      )}
      {editMode && isEditable && onEdit && (
        <button
          onClick={handleEdit}
          class="btn btn-sm btn-primary ms-2"
          style={{ position: 'relative', zIndex: 10, flexShrink: 0 }}
          aria-label={`Edit ${props.app.name}`}
          title={`Edit ${props.app.name}`}
        >
          <Icon icon="mdi:pencil" width="16" height="16" />
        </button>
      )}
    </div>
  );
}

export default Application;
