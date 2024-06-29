import { Icon } from '@iconify/react';
import ApplicationProps from './ApplicationProps';

function Application({ name, url, info, icon }: ApplicationProps) {
  // if the icon does not have a colon, assume it is a material icon
  if (!icon.includes(":")) {
    icon = `mdi:${icon}`;
  }

  return (
    <a href={url} className="list-group-item list-group-item-action d-flex gap-3 py-1">
      <Icon icon={icon} width="32" height="32" />
      <div className="d-flex gap-2 w-100 justify-content-between">
        <div>
          <h6 className="mb-0 h5 text-start">{name}</h6>
          <p className="mb-0 opacity-75 text-start">{info}</p>
        </div>
        <small className="opacity-50 text-nowrap"></small>
      </div>
    </a>
  );
}

export default Application;
