import { Icon } from '@iconify/react';

function renderIcon(icon, iconColor, name, isUnavailable) {
  const opacity = isUnavailable ? 0.4 : 1;
  if (!icon) return null;
  if (icon.includes('://')) {
    return <img src={icon} alt={name} class="me-3" width="48" height="48" style={{ color: iconColor, opacity }} />;
  }
  if (!icon.includes(':')) {
    icon = `mdi:${icon}`;
  }
  return <Icon icon={icon} class="me-3 fs-2 text-primary" width="48" height="48" color={iconColor} style={{ opacity }} />;
}

export function Application(props) {
  const isUnavailable = props.app.available === false;
  const containerClass = `col d-flex align-items-start${isUnavailable ? ' unavailable' : ''}`;
  const containerStyle = `transform: rotate(0);${isUnavailable ? ' opacity: 0.5; cursor: not-allowed;' : ''}`;
  
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
      {renderIcon(props.app.icon, props.app.iconColor, props.app.name, isUnavailable)}
      <div class="px-2">
        <h3 class="fw-normal mb-0 fs-4 text-body-emphasis text-uppercase">{props.app.name}</h3>
        <p class="accent text-uppercase">{props.app.info}</p>
      </div>
    </div>
  );
}

export default Application;
