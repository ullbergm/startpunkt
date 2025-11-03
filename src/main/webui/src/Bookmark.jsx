import { Icon } from '@iconify/react';
import { Text } from 'preact-i18n';

export function Bookmark(props) {
  const { layoutPrefs, onEdit } = props;
  const isEditable = !props.bookmark.hasOwnerReferences;
  const editMode = layoutPrefs?.preferences.editMode;
  
  // Get preferences with defaults
  const viewMode = layoutPrefs?.preferences.viewMode || 'grid';
  const showDescription = layoutPrefs?.preferences.showDescription !== false;
  const iconSize = layoutPrefs?.getCSSVariables()['--card-icon-size']?.replace('px', '') || '48';
  const fontSize = layoutPrefs?.getCSSVariables()['--card-font-size'] || '1rem';
  const padding = layoutPrefs?.getCSSVariables()['--card-padding'] || '1rem';
  
  // Build container style
  const containerStyle = {
    transform: 'rotate(0)',
    padding: padding,
    position: 'relative',
    ...(editMode && isEditable && { 
      outline: '2px solid rgba(13, 110, 253, 0.5)',
      outlineOffset: '2px',
      borderRadius: '4px',
      backgroundColor: 'rgba(13, 110, 253, 0.05)',
      cursor: 'pointer'
    }),
    ...(editMode && !isEditable && { 
      opacity: '0.6'
    })
  };
  
  const handleClick = (e) => {
    if (editMode && isEditable && onEdit) {
      e.preventDefault();
      e.stopPropagation();
      onEdit(props.bookmark);
    }
  };
  
  const renderIcon = (icon, name, size) => {
    const iconStyle = {
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
          <img
            src={icon}
            alt={name}
            width={size}
            height={size}
            style={{ display: 'block', objectFit: 'contain' }}
          />
        </div>
      );
    }
    const iconValue = !icon.includes(':') ? `mdi:${icon}` : icon;
    return (
      <div class="me-1" style={iconStyle}>
        <Icon
          icon={iconValue}
          class="fs-2 text-primary"
          width={size}
          height={size}
          style={{ display: 'block' }}
        />
      </div>
    );
  };
  
  // List view - compact horizontal layout
  if (viewMode === 'list') {
    return (
      <div 
        class="d-flex align-items-start" 
        style={containerStyle}
        onClick={handleClick}
        role="article" 
        aria-label={`Bookmark: ${props.bookmark.name}${editMode && isEditable ? ' (click to edit)' : ''}${editMode && !isEditable ? ' (cannot edit - managed externally)' : ''}`}
      >
        {!editMode && (
          <a
            href={props.bookmark.url}
            target={props.bookmark.targetBlank ? '_blank' : '_self'}
            class="stretched-link"
            rel="external noopener noreferrer"
            aria-label={`${props.bookmark.name}${props.bookmark.info ? ` - ${props.bookmark.info}` : ''}`}
          />
        )}
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
    <div 
      class="d-flex align-items-start" 
      style={containerStyle}
      onClick={handleClick}
      role="article" 
      aria-label={`Bookmark: ${props.bookmark.name}${editMode && isEditable ? ' (click to edit)' : ''}${editMode && !isEditable ? ' (cannot edit - managed externally)' : ''}`}
    >
      {!editMode && (
        <a
          href={props.bookmark.url}
          target={props.bookmark.targetBlank ? '_blank' : '_self'}
          class="stretched-link"
          rel="external noopener noreferrer"
          aria-label={`${props.bookmark.name}${props.bookmark.info ? ` - ${props.bookmark.info}` : ''}`}
        />
      )}
      {renderIcon(props.bookmark.icon, props.bookmark.name, iconSize)}
      <div class="px-2" style={{ flexGrow: 1 }}>
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
