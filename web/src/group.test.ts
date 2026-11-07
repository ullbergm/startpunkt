import { describe, expect, it } from 'vitest';
import { groupTiles } from './group';
import { tile } from './testing';

describe('groupTiles', () => {
  it('separates kinds and orders groups by name', () => {
    const tiles = [
      tile({ name: 'a', group: 'media' }),
      tile({ name: 'b', group: 'admin' }),
      tile({ name: 'c', group: 'links', kind: 'bookmark' }),
    ];
    expect(groupTiles(tiles, 'application').map((g) => g.name)).toEqual(['admin', 'media']);
    expect(groupTiles(tiles, 'bookmark').map((g) => g.name)).toEqual(['links']);
  });

  it('orders tiles by location, then name without regard to case', () => {
    const tiles = [
      tile({ name: 'zeta' }),
      tile({ name: 'Alpha' }),
      tile({ name: 'pinned', location: 1 }),
    ];
    expect(groupTiles(tiles, 'application')[0]?.tiles.map((t) => t.name)).toEqual([
      'pinned',
      'Alpha',
      'zeta',
    ]);
  });

  it('keeps tiles with the same name apart', () => {
    const tiles = [
      tile({ id: 'prod/apps/ns/grafana', name: 'Grafana', cluster: 'prod' }),
      tile({ id: 'dev/apps/ns/grafana', name: 'Grafana', cluster: 'dev' }),
    ];
    expect(groupTiles(tiles, 'application')[0]?.tiles.map((t) => t.id)).toEqual([
      'dev/apps/ns/grafana',
      'prod/apps/ns/grafana',
    ]);
  });
});
