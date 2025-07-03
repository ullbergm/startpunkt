import { Icon } from '@iconify/react';

export function Bookmark(props) {
  return (
    <div class="col d-flex align-items-start" style="transform: rotate(0);">
      <a
        href={props.bookmark.url}
        target={props.bookmark.targetBlank ? '_blank' : '_self'}
        class="stretched-link"
        rel="external noopener noreferrer"
      ></a>

      {/* Icon logic: 
          - If icon includes '://', treat as image URL and render <img>
          - If icon exists and has no ':' then prepend 'mdi:' prefix and render Icon component
          - If icon includes ':' just render Icon component with it
          - Otherwise render nothing
      */}
      {props.bookmark.icon && props.bookmark.icon.includes('://') ? (
        <img
          src={props.bookmark.icon}
          alt={props.bookmark.name}
          class="me-3"
          width="48"
          height="48"
        />
      ) : props.bookmark.icon && !props.bookmark.icon.includes(':') ? (
        <Icon
          icon={`mdi:${props.bookmark.icon}`}
          class="me-3 fs-2 text-primary"
          width="48"
          height="48"
        />
      ) : props.bookmark.icon ? (
        <Icon
          icon={props.bookmark.icon}
          class="me-3 fs-2 text-primary"
          width="48"
          height="48"
        />
      ) : (
        ''
      )}

      <div class="px-2">
        <h3 class="fw-normal mb-0 fs-4 text-body-emphasis text-uppercase">
          {props.bookmark.name}
        </h3>
        <p class="accent text-uppercase">{props.bookmark.info}</p>
      </div>
    </div>
  );
}

export default Bookmark;
