// Schemes that run script in the page's origin when used as a link target.
const SCRIPT_SCHEMES = new Set(['javascript:', 'data:', 'vbscript:']);

// Returns the URL when it is safe to use as a link target, otherwise null.
// Tile URLs come from cluster resources that many people may be able to
// create, so they are not trusted.
export function safeHref(url: string): string | null {
  const trimmed = url.trim();
  if (trimmed === '') return null;
  try {
    const parsed = new URL(trimmed, window.location.href);
    return SCRIPT_SCHEMES.has(parsed.protocol) ? null : trimmed;
  } catch {
    return null;
  }
}

const ICON_PART = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const COLOR = /^(?:#[0-9a-fA-F]{3,8}|[a-zA-Z]+)$/;

// Returns the image URL for a tile's icon, or null when there is none.
//
// An icon is either an image URL or an Iconify name such as "mdi:home". A
// name without a prefix is taken from the "mdi" set, as in 4.x. Iconify icons
// are fetched as images, never as script.
export function iconSource(icon: string | undefined, color: string): string | null {
  const value = icon?.trim();
  if (!value) return null;
  if (value.includes('://')) {
    return /^https?:\/\//i.test(value) ? value : null;
  }
  const [prefix, name, ...rest] = value.includes(':') ? value.split(':') : ['mdi', value];
  if (rest.length > 0 || !prefix || !name || !ICON_PART.test(prefix) || !ICON_PART.test(name)) {
    return null;
  }
  const query = COLOR.test(color) ? `?color=${encodeURIComponent(color)}` : '';
  return `https://api.iconify.design/${prefix}/${name}.svg${query}`;
}
