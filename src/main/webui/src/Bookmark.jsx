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
      backgroundColor: 'rgba(13, 110, 253, 0.05)'
    }),
    ...(editMode && !isEditable && { 
      opacity: '0.6'
    })
  };
  
  const handleEdit = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (onEdit && isEditable) {
      onEdit(props.bookmark);
    }
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
      <div 
        class="d-flex align-items-start" 
        style={containerStyle} 
        role="article" 
        aria-label={`Bookmark: ${props.bookmark.name}${editMode && !isEditable ? ' (cannot edit - managed externally)' : ''}`}
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
            {editMode && !isEditable && (
              <span class="badge bg-secondary mt-1" style={{ fontSize: '0.65rem' }} role="status" title="Managed by external system">
                <Icon icon="mdi:lock" width="10" height="10" class="me-1" />
                <Text id="layout.cannotEdit">Cannot Edit</Text>
              </span>
            )}
          </div>
        </div>
        {editMode && isEditable && onEdit && (
          <button
            onClick={handleEdit}
            class="btn btn-sm btn-primary ms-2"
            style={{ position: 'relative', zIndex: 10, flexShrink: 0 }}
            aria-label={`Edit ${props.bookmark.name}`}
            title={`Edit ${props.bookmark.name}`}
          >
            <Icon icon="mdi:pencil" width="16" height="16" />
          </button>
        )}
      </div>
    );
  }
  
  // Grid view - standard card layout
  return (
    <div 
      class="d-flex align-items-start" 
      style={containerStyle} 
      role="article" 
      aria-label={`Bookmark: ${props.bookmark.name}${editMode && !isEditable ? ' (cannot edit - managed externally)' : ''}`}
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
        {editMode && !isEditable && (
          <span class="badge bg-secondary mt-1" style={{ fontSize: '0.65rem' }} role="status" title="Managed by external system">
            <Icon icon="mdi:lock" width="10" height="10" class="me-1" />
            <Text id="layout.cannotEdit">Cannot Edit</Text>
          </span>
        )}
      </div>
      {editMode && isEditable && onEdit && (
        <button
          onClick={handleEdit}
          class="btn btn-sm btn-primary ms-2"
          style={{ position: 'relative', zIndex: 10, flexShrink: 0 }}
          aria-label={`Edit ${props.bookmark.name}`}
          title={`Edit ${props.bookmark.name}`}
        >
          <Icon icon="mdi:pencil" width="16" height="16" />
        </button>
      )}
    </div>
  );
}

export default Bookmark;
