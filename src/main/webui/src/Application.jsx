import { Icon } from '@iconify/react';

export function Application(props) {
  return (
    <div class="col d-flex align-items-start" style="transform: rotate(0);">
      <a href={props.app.url} target="_blank" class="stretched-link"></a>
      {/* if the icon has :// in it, it's a URL to an image, otherwise it's a local icon, if it is an icon and has no : in it, then prepend mdi: to it */}
      {props.app.icon.includes('://') ? (
        <img src={props.app.icon} alt={props.app.name} class="me-3" width="48" height="48" />
      ) : (
        <Icon icon={props.app.icon.includes(':') ? props.app.icon : `mdi:${props.app.icon}`} class="me-3 fs-2 text-primary" width="48" height="48" />
      )}
      
      <div class="px-2">
        <h3 class="fw-bold mb-0 fs-4 text-body-emphasis text-uppercase">{props.app.name}</h3>
        <p class="accent text-uppercase">{props.app.info}</p>
      </div>
    </div>
  )
}

export default Application;