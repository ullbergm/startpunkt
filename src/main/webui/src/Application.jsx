import { Icon } from '@iconify/react';

export function Application(props) {
  return (
    <div class="col d-flex align-items-start" style="transform: rotate(0);">
      <a href={props.app.url} target={props.app.targetBlank ? '_blank' : '_self'} class="stretched-link" rel="external noopener noreferrer"></a>
      {/* // if the icon has :// in it, it's a URL to an image, otherwise it's a local icon, if it is an icon and has no : in it, then prepend mdi: to it, if the icon is undefined then show nothing */}
        {props.app.icon && props.app.icon.includes('://') ? (
        <img src={props.app.icon} alt={props.app.name} class="me-3" width="48" height="48" style={{ color: props.app.iconColor }} />
        ) : props.app.icon && !props.app.icon.includes(':') ? (
          <Icon icon={`mdi:${props.app.icon}`} class="me-3 fs-2 text-primary" width="48" height="48" color={ props.app.iconColor } />
        ) : props.app.icon ? (
          <Icon icon={props.app.icon} class="me-3 fs-2 text-primary" width="48" height="48" color={ props.app.iconColor } />
        ) : (
          ''
        )}

      <div class="px-2">
        <h3 class="fw-bold mb-0 fs-4 text-body-emphasis text-uppercase">{props.app.name}</h3>
        <p class="accent text-uppercase">{props.app.info}</p>
      </div>
    </div>
  )
}

export default Application;
