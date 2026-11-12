import type { Tile } from './types';

export const MAX_RESULTS = 12;

// A query that starts with "?" is a web search, not a search of the tiles.
export function webQuery(query: string): string | null {
  const trimmed = query.trim();
  return trimmed.startsWith('?') ? trimmed.slice(1).trim() : null;
}

// Lower-cased words, with accents removed so that "cafe" finds "Café".
function words(text: string): string[] {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);
}

// Finds tiles by name, as 4.x does: each word of the query must be the
// start of a word in the tile's name. "ho as" finds "Home Assistant"; "ome"
// does not. Descriptions, groups and addresses are not searched, because
// matching on them returns most of the page for a short query.
//
// One addition: a word of the query may instead be the start of the tile's
// cluster name, as long as another word matches the name. That lets
// "grafana prod" pick one tile among several of the same name.
//
// Tiles whose name starts with the query come first; the rest keep the
// order they came in.
export function searchTiles(tiles: Tile[], query: string, limit = MAX_RESULTS): Tile[] {
  const wanted = words(query);
  if (wanted.length === 0) return [];
  const whole = wanted.join(' ');
  const scored: { tile: Tile; score: number; index: number }[] = [];
  tiles.forEach((tile, index) => {
    const name = words(tile.name);
    const cluster = words(tile.cluster);
    const inName = (word: string) => name.some((part) => part.startsWith(word));
    const inCluster = (word: string) => cluster.some((part) => part.startsWith(word));
    if (!wanted.some(inName) || !wanted.every((word) => inName(word) || inCluster(word))) return;
    scored.push({ tile, score: name.join(' ').startsWith(whole) ? 0 : 1, index });
  });
  return scored
    .sort((a, b) => a.score - b.score || a.index - b.index)
    .slice(0, limit)
    .map((entry) => entry.tile);
}
