import { Icon } from '@iconify/react';
import { Text } from 'preact-i18n';
import './components/SkeletonLoader.scss';

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
  const { layoutPrefs, onEdit, isFavorite, onToggleFavorite, skeleton, showClusterName } = props;
  const isUnavailable = props.app?.available === false;
  const isEditable = !props.app?.hasOwnerReferences;
  const editMode = layoutPrefs?.preferences.editMode && !skeleton;
  
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
  
  // Skeleton mode - render placeholder UI
  if (skeleton) {
    // Use actual text lengths to determine skeleton widths for realistic sizing
    // Approximate character widths: ~8px per character for names, ~6px per character for descriptions
    const nameLength = props.app.name.length;
    const descriptionLength = props.app.info ? props.app.info.length : 0;
    const nameHash = props.app.name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    
    // Calculate widths based on actual text length
    const nameWidthPx = nameLength * 8; // ~8px per character for uppercase names
    const descWidthPx = descriptionLength * 6; // ~6px per character for descriptions
    
    // Split description into words for skeleton rendering
    const descWords = props.app.info ? props.app.info.split(' ') : [];

    return (
      <div 
        class="d-flex align-items-start skeleton-application" 
        style={{
          transform: 'rotate(0)',
          padding: padding
        }}
        role="article" 
        aria-hidden="true"
      >
        {/* Icon skeleton */}
        <div 
          class="skeleton-icon skeleton-pulse me-1" 
          style={{ 
            minWidth: '48px', 
            minHeight: '48px', 
            maxWidth: '48px', 
            maxHeight: '48px', 
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(128, 128, 128, 0.3)',
            borderRadius: '8px'
          }} 
        />
        
        <div class="px-2" style={{ fontSize: '0.875rem', flexGrow: 1 }}>
          {/* Name skeleton - using h4 to match real component, width based on actual name length */}
          <h4 class="fw-normal mb-0 text-body-emphasis text-uppercase">
            <span
              class="skeleton-text skeleton-pulse" 
              style={{ 
                height: '1.5rem', 
                width: `${nameWidthPx}px`,
                minWidth: '60px',
                backgroundColor: 'rgba(128, 128, 128, 0.3)',
                borderRadius: '3px',
                display: 'inline-block'
              }} 
            />
          </h4>
          
          {/* Description skeleton - using p to match real component, render word-like blocks based on actual words */}
          {showDescription && descWords.length > 0 && (
            <p class="accent text-uppercase" style={{ marginBottom: 0, display: 'flex', flexWrap: 'wrap', gap: '0.3rem', alignItems: 'center' }}>
              {descWords.map((word, index) => (
                <span
                  key={index}
                  class="skeleton-text skeleton-pulse" 
                  style={{ 
                    height: '0.9rem', 
                    width: `${word.length * 6}px`, // ~6px per character for description text
                    minWidth: '15px',
                    backgroundColor: 'rgba(128, 128, 128, 0.3)',
                    borderRadius: '3px',
                    display: 'inline-block'
                  }} 
                />
              ))}
            </p>
          )}
          
          {/* Tags skeleton - only if showTags is true and 25% chance */}
          {showTags && (nameHash % 4 === 0) && (
            <div class="d-flex gap-1 mt-1" style={{ flexWrap: 'wrap' }}>
              <div 
                class="skeleton-badge skeleton-pulse" 
                style={{ 
                  height: '1rem', 
                  width: '3rem',
                  backgroundColor: 'rgba(128, 128, 128, 0.3)',
                  borderRadius: '12px'
                }} 
              />
              <div 
                class="skeleton-badge skeleton-pulse" 
                style={{ 
                  height: '1rem', 
                  width: '2.5rem',
                  backgroundColor: 'rgba(128, 128, 128, 0.3)',
                  borderRadius: '12px'
                }} 
              />
            </div>
          )}
          
          {/* Status badge skeleton - only if showStatus is true and 10% chance */}
          {showStatus && (nameHash % 10 === 0) && (
            <div 
              class="skeleton-badge skeleton-pulse mt-1" 
              style={{ 
                height: '1.2rem', 
                width: '4rem',
                backgroundColor: 'rgba(128, 128, 128, 0.3)',
                borderRadius: '12px'
              }} 
            />
          )}
        </div>
      </div>
    );
  }
  
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
      {editMode && onToggleFavorite && (
        <button
          onClick={handleToggleFavorite}
          class="btn btn-sm btn-link"
          style={{ 
            position: 'absolute', 
            top: '0.25rem',
            right: '0.25rem',
            zIndex: 10, 
            padding: '0.25rem',
            minWidth: 'auto',
            lineHeight: 1,
            color: isFavorite ? '#ffc107' : '#6c757d'
          }}
          aria-label={isFavorite ? `Remove ${props.app.name} from favorites` : `Add ${props.app.name} to favorites`}
          aria-pressed={isFavorite}
          title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
        >
          <Icon icon={isFavorite ? 'mdi:star' : 'mdi:star-outline'} width="20" height="20" />
        </button>
      )}
      {renderIcon(props.app.icon, props.app.iconColor, props.app.name, isUnavailable)}
      <div class="px-2" style={{ fontSize: '0.875rem', flexGrow: 1 }}>
        <h4 class="fw-normal mb-0 text-body-emphasis text-uppercase">
          {props.app.name}
        </h4>
        {showDescription && props.app.info && (
          <p class="accent text-uppercase" style={{ marginBottom: 0 }}>{props.app.info}</p>
        )}
        {showClusterName && props.app.cluster && props.app.cluster !== 'local' && (
          <div class="mt-1">
            <span 
              class="badge bg-info text-dark" 
              style={{ fontSize: '0.65rem' }} 
              role="status"
              aria-label={`Cluster: ${props.app.cluster}`}
              title={`This application is from the ${props.app.cluster} cluster`}
            >
              <Icon icon="mdi:server-network" width="12" height="12" style={{ marginRight: '0.2rem', verticalAlign: 'middle' }} />
              {props.app.cluster}
            </span>
          </div>
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
    </div>
  );
}

export default Application;
