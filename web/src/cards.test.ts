import { describe, expect, it } from 'vitest';
import { groupCards, toCards } from './cards';
import { tile } from './testing';

const single = (tiles: ReturnType<typeof tile>[]) => toCards(tiles, false, []);

describe('groupCards', () => {
  it('separates kinds and orders groups by name', () => {
    const cards = single([
      tile({ name: 'a', group: 'media' }),
      tile({ name: 'b', group: 'admin' }),
      tile({ name: 'c', group: 'links', kind: 'bookmark' }),
    ]);
    expect(groupCards(cards, 'application').map((g) => g.name)).toEqual(['admin', 'media']);
    expect(groupCards(cards, 'bookmark').map((g) => g.name)).toEqual(['links']);
  });

  it('orders cards by location, then name without regard to case', () => {
    const cards = single([tile({ name: 'zeta' }), tile({ name: 'Alpha' }), tile({ name: 'pinned', location: 1 })]);
    expect(groupCards(cards, 'application')[0]?.cards.map((c) => c.primary.name)).toEqual(['pinned', 'Alpha', 'zeta']);
  });
});

describe('toCards', () => {
  const grafana = (cluster: string, extra = {}) =>
    tile({ id: `${cluster}/apps/ns/grafana`, name: 'Grafana', group: 'observability', cluster, ...extra });

  it('keeps every tile apart when combining is off', () => {
    const cards = toCards([grafana('prod'), grafana('dev')], false, ['dev', 'prod']);
    expect(cards.map((c) => c.members.length)).toEqual([1, 1]);
  });

  it('combines the same service on several clusters, the local cluster first', () => {
    const cards = toCards([grafana('prod'), grafana('local'), grafana('dev')], true, ['local', 'dev', 'prod']);
    expect(cards).toHaveLength(1);
    expect(cards[0]!.members.map((t) => t.cluster)).toEqual(['local', 'dev', 'prod']);
    expect(cards[0]!.primary.cluster).toBe('local');
    expect(cards[0]!.key).toBe('local/apps/ns/grafana');
  });

  it('takes the first cluster in order when there is no local tile', () => {
    const cards = toCards([grafana('prod'), grafana('dev')], true, ['local', 'dev', 'prod']);
    expect(cards[0]!.primary.cluster).toBe('dev');
  });

  it('compares names without regard to case, but not kind or group', () => {
    const cards = toCards(
      [
        grafana('a'),
        grafana('b', { name: 'grafana ' }),
        grafana('c', { group: 'other' }),
        grafana('d', { kind: 'bookmark' }),
        tile({ id: 'e/apps/ns/plex', name: 'Plex', cluster: 'e', group: 'observability' }),
      ],
      true,
      ['a', 'b', 'c', 'd', 'e'],
    );
    expect(cards.map((c) => c.members.map((t) => t.cluster).join('+')).sort()).toEqual(['a+b', 'c', 'd', 'e']);
  });

  it('puts clusters it does not know last', () => {
    const cards = toCards([grafana('unknown'), grafana('known')], true, ['known']);
    expect(cards[0]!.members.map((t) => t.cluster)).toEqual(['known', 'unknown']);
  });
});
