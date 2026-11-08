import type { Tile } from './types';

export const MAX_RESULTS = 12;

// A query that starts with "?" is a web search, not a search of the tiles.
export function webQuery(query: string): string | null {
  const trimmed = query.trim();
  return trimmed.startsWith('?') ? trimmed.slice(1).trim() : null;
}

function host(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return '';
  }
}

// Finds tiles for a query. Every word must occur somewhere in the tile: its
// name, group, description, tags, cluster or host. The cluster is included
// so that "grafana prod" finds one tile among several of the same name.
//
// Tiles whose name starts with the query come first, then those whose name
// contains a word, then the rest; ties keep the order they came in.
export function searchTiles(tiles: Tile[], query: string, limit = MAX_RESULTS): Tile[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  const whole = words.join(' ');
  const scored: { tile: Tile; score: number; index: number }[] = [];
  tiles.forEach((tile, index) => {
    const name = tile.name.toLowerCase();
    const haystack = [name, tile.group, tile.info ?? '', tile.tags.join(' '), tile.cluster, host(tile.url)]
      .join(' ')
      .toLowerCase();
    if (!words.every((word) => haystack.includes(word))) return;
    const score = name.startsWith(whole) ? 0 : words.some((word) => name.includes(word)) ? 1 : 2;
    scored.push({ tile, score, index });
  });
  return scored
    .sort((a, b) => a.score - b.score || a.index - b.index)
    .slice(0, limit)
    .map((entry) => entry.tile);
}
