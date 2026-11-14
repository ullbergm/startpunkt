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

// Matches names using word prefixes first, then letters in their written
// order: "osft" finds "OpenShift". One-letter searches still use prefixes
// so they stay useful. A cluster may satisfy a query word only when at
// least one other word matches the tile's name.
function match(parts: string[], word: string): boolean {
  if (parts.some((part) => part.startsWith(word))) return true;
  if (word.length < 2) return false;
  let next = 0;
  for (const letter of parts.join('')) {
    if (letter === word[next]) next++;
    if (next === word.length) return true;
  }
  return false;
}

export function searchTiles(tiles: Tile[], query: string, limit = MAX_RESULTS): Tile[] {
  const wanted = words(query);
  if (wanted.length === 0) return [];
  const whole = wanted.join(' ');
  const scored: { tile: Tile; score: number; index: number }[] = [];
  tiles.forEach((tile, index) => {
    const name = words(tile.name);
    const cluster = words(tile.cluster);
    const inName = (word: string) => match(name, word);
    const inCluster = (word: string) => match(cluster, word);
    if (!wanted.some(inName) || !wanted.every((word) => inName(word) || inCluster(word))) return;
    const fullName = name.join(' ');
    const prefixes = wanted.every((word) => [...name, ...cluster].some((part) => part.startsWith(word)));
    const score = fullName === whole ? 0 : fullName.startsWith(whole) ? 1 : prefixes ? 2 : 3;
    scored.push({ tile, score, index });
  });
  return scored
    .sort((a, b) => a.score - b.score || a.index - b.index)
    .slice(0, Math.max(0, limit))
    .map((entry) => entry.tile);
}
