import type { Tile } from './types';

// Reads the tag filter from the URL path: "/admin,dev" selects the tags
// "admin" and "dev". The first path segment is the filter; an empty path
// selects no tags.
export function tagsFromPath(pathname: string): string[] {
  const segment = pathname.split('/').find((part) => part !== '') ?? '';
  let decoded = segment;
  try {
    decoded = decodeURIComponent(segment);
  } catch {
    // Keep the raw segment when it is not valid percent-encoding.
  }
  const tags = decoded
    .split(',')
    .map((tag) => tag.trim().toLowerCase())
    .filter((tag) => tag !== '');
  return [...new Set(tags)];
}

// Applies the tag filter. Untagged tiles are always visible. A tagged tile is
// visible when one of its tags is selected.
//
// This is a view filter, not access control: the server sends every tile.
export function filterByTags(tiles: Tile[], selected: string[]): Tile[] {
  const wanted = new Set(selected);
  return tiles.filter((tile) => tile.tags.length === 0 || tile.tags.some((tag) => wanted.has(tag)));
}
