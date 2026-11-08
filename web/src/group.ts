import type { Tile, TileKind } from './types';

export interface TileGroup {
  name: string;
  tiles: Tile[];
}

function compareTiles(a: Tile, b: Tile): number {
  return (
    a.location - b.location ||
    a.name.toLowerCase().localeCompare(b.name.toLowerCase()) ||
    a.id.localeCompare(b.id)
  );
}

// Groups the tiles of one kind, or of every kind when kind is null, by group
// name. Groups are ordered by name and
// tiles by location, then name. Tiles are never merged: two tiles with the
// same name stay two tiles.
export function groupTiles(tiles: Tile[], kind: TileKind | null): TileGroup[] {
  const groups = new Map<string, Tile[]>();
  for (const tile of tiles) {
    if (kind !== null && tile.kind !== kind) continue;
    const members = groups.get(tile.group);
    if (members) {
      members.push(tile);
    } else {
      groups.set(tile.group, [tile]);
    }
  }
  return [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, members]) => ({ name, tiles: members.sort(compareTiles) }));
}
