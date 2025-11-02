import { Icon } from '@iconify/react';
import { useState, useEffect, useRef } from 'preact/hooks';

export function Bookmark(props) {
  const { layoutPrefs, onEdit } = props;
  const [showEditButton, setShowEditButton] = useState(false);
  const hoverTimeoutRef = useRef(null);
  
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
    position: 'relative'
  };
  
  const handleMouseEnter = () => {
    if (onEdit) {
      hoverTimeoutRef.current = setTimeout(() => {
        setShowEditButton(true);
      }, 2000);
    }
  };
  
  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setShowEditButton(false);
  };
  
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);
  
  const handleEdit = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (onEdit) {
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
        aria-label={`Bookmark: ${props.bookmark.name}`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <a
          href={props.bookmark.url}
          target={props.bookmark.targetBlank ? '_blank' : '_self'}
          class="stretched-link"
          rel="external noopener noreferrer"
          aria-label={`${props.bookmark.name}${props.bookmark.info ? ` - ${props.bookmark.info}` : ''}`}
        />
        {renderIcon(props.bookmark.icon, props.bookmark.name, iconSize)}
        <div class="d-flex align-items-center flex-grow-1">
          <div>
            <h3 class="fw-normal mb-0 text-body-emphasis text-uppercase" style={{ fontSize }}>
              {props.bookmark.name}
            </h3>
          </div>
        </div>
        {onEdit && showEditButton && (
          <button
            onClick={handleEdit}
            class="btn btn-sm btn-outline-secondary ms-2"
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
      aria-label={`Bookmark: ${props.bookmark.name}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <a
        href={props.bookmark.url}
        target={props.bookmark.targetBlank ? '_blank' : '_self'}
        class="stretched-link"
        rel="external noopener noreferrer"
        aria-label={`${props.bookmark.name}${props.bookmark.info ? ` - ${props.bookmark.info}` : ''}`}
      />
      {renderIcon(props.bookmark.icon, props.bookmark.name, iconSize)}
      <div class="px-2" style={{ flexGrow: 1 }}>
        <h3 class="fw-normal mb-0 text-body-emphasis text-uppercase" style={{ fontSize }}>
          {props.bookmark.name}
        </h3>
        {showDescription && props.bookmark.info && (
          <p class="accent text-uppercase" style={{ marginBottom: 0 }}>{props.bookmark.info}</p>
        )}
      </div>
      {onEdit && showEditButton && (
        <button
          onClick={handleEdit}
          class="btn btn-sm btn-outline-secondary ms-2"
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
