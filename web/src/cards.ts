import type { Tile, TileKind } from './types';

// What is shown as one card: a tile, or the tiles of the same service on
// several clusters. Combining is for display only. The store, the API and
// the stored preferences keep separate tiles.
export interface Card {
  // The id of the first member, which is stable while the card exists.
  key: string;
  // The tile the card's name, icon, description and link come from: the
  // local cluster's when there is one, otherwise the first cluster's.
  primary: Tile;
  // Every tile of the card, in the order of the clusters.
  members: Tile[];
}

export interface CardGroup {
  name: string;
  cards: Card[];
}

// Turns tiles into cards. With combine on, tiles whose kind, group and name
// match become one card; names are compared without regard to case. order
// lists the cluster names, the local one first.
export function toCards(tiles: Tile[], combine: boolean, order: string[]): Card[] {
  const rank = (tile: Tile) => {
    const index = order.indexOf(tile.cluster);
    return index < 0 ? order.length : index;
  };
  if (!combine) {
    return tiles.map((tile) => ({ key: tile.id, primary: tile, members: [tile] }));
  }
  const byService = new Map<string, Tile[]>();
  for (const tile of tiles) {
    const service = [tile.kind, tile.group, tile.name.trim().toLowerCase()].join('\u0000');
    const members = byService.get(service);
    if (members) {
      members.push(tile);
    } else {
      byService.set(service, [tile]);
    }
  }
  return [...byService.values()].map((members) => {
    members.sort((a, b) => rank(a) - rank(b) || a.id.localeCompare(b.id));
    return { key: members[0]!.id, primary: members[0]!, members };
  });
}

function compareCards(a: Card, b: Card): number {
  return (
    a.primary.location - b.primary.location ||
    a.primary.name.toLowerCase().localeCompare(b.primary.name.toLowerCase()) ||
    a.key.localeCompare(b.key)
  );
}

// Groups the cards of one kind by group name. Groups are ordered by name and
// cards by location, then name.
export function groupCards(cards: Card[], kind: TileKind): CardGroup[] {
  const groups = new Map<string, Card[]>();
  for (const card of cards) {
    if (card.primary.kind !== kind) continue;
    const members = groups.get(card.primary.group);
    if (members) {
      members.push(card);
    } else {
      groups.set(card.primary.group, [card]);
    }
  }
  return [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, members]) => ({ name, cards: members.sort(compareCards) }));
}
