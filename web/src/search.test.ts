import { describe, expect, it } from 'vitest';
import { searchTiles, webQuery } from './search';
import { tile } from './testing';

const tiles = [
  tile({ id: 'prod/a/ns/grafana', name: 'Grafana', cluster: 'prod', group: 'observability', info: 'Dashboards' }),
  tile({ id: 'dev/a/ns/grafana', name: 'Grafana', cluster: 'dev', group: 'observability' }),
  tile({ name: 'Plex', group: 'media', tags: ['home'], url: 'https://plex.example.com' }),
  tile({ name: 'Grafana docs', kind: 'bookmark', group: 'reference' }),
  tile({ name: 'Metrics', info: 'Feeds Grafana', group: 'observability' }),
];
const ids = (query: string) => searchTiles(tiles, query).map((t) => t.id);
const names = (query: string) => searchTiles(tiles, query).map((t) => t.name);

describe('searchTiles', () => {
  it('returns nothing for an empty query', () => {
    expect(searchTiles(tiles, '   ')).toEqual([]);
  });

  it('matches the start of a word in the name, without regard to case', () => {
    expect(names('PLEX')).toEqual(['Plex']);
    expect(names('pl')).toEqual(['Plex']);
    expect(names('doc')).toEqual(['Grafana docs']);
    expect(names('gr do')).toEqual(['Grafana docs']);
  });

  it('matches letters in order, including the middle of a word', () => {
    expect(names('lex')).toEqual(['Plex']);
    expect(names('afana')).toEqual(['Grafana', 'Grafana', 'Grafana docs']);
    expect(names('xelp')).toEqual([]);
    expect(searchTiles([tile({ name: 'OpenShift' })], 'Osft').map((t) => t.name)).toEqual(['OpenShift']);
    expect(searchTiles([tile({ name: 'Home Assistant' })], 'hmasst')).toHaveLength(1);
  });

  it('ranks exact names, whole-name prefixes and word prefixes before fuzzy matches', () => {
    const list = ['OpenShift', 'My Osft tools', 'Osft tools', 'Osft', 'Other Shift'].map((name) => tile({ name }));
    expect(searchTiles(list, 'osft').map((t) => t.name)).toEqual([
      'Osft', 'Osft tools', 'My Osft tools', 'OpenShift', 'Other Shift',
    ]);
  });

  it('keeps input order for equally ranked fuzzy matches and supports fuzzy cluster qualifiers', () => {
    const list = [
      tile({ name: 'OpenShift A', cluster: 'production' }),
      tile({ name: 'OpenShift B', cluster: 'development' }),
      tile({ name: 'OpenShift C', cluster: 'production' }),
    ];
    expect(searchTiles(list, 'osft pdtn').map((t) => t.name)).toEqual(['OpenShift A', 'OpenShift C']);
    expect(searchTiles(list, 'pdtn')).toEqual([]);
  });

  it('does not search descriptions, groups, tags or addresses', () => {
    expect(names('dashboards')).toEqual([]); // a description
    expect(names('media')).toEqual([]); // a group
    expect(names('home')).toEqual([]); // a tag
    expect(names('example')).toEqual([]); // part of every address
    expect(names('feeds')).toEqual([]); // "Metrics" mentions Grafana only in its description
  });

  it('stays short for a single letter', () => {
    expect(names('p')).toEqual(['Plex']);
    expect(names('m')).toEqual(['Metrics']);
  });

  it('uses the cluster to tell tiles of the same name apart', () => {
    expect(ids('grafana prod')).toEqual(['prod/a/ns/grafana']);
    expect(ids('grafana dev')).toEqual(['dev/a/ns/grafana']);
    expect(ids('grafana nowhere')).toEqual([]);
    // The cluster alone finds nothing: something has to match a name.
    expect(ids('prod')).toEqual([]);
  });

  it('puts names that start with the query first', () => {
    const list = [tile({ name: 'My Grafana' }), tile({ name: 'Grafana' })];
    expect(searchTiles(list, 'graf').map((t) => t.name)).toEqual(['Grafana', 'My Grafana']);
  });

  it('ignores accents and punctuation', () => {
    const list = [tile({ name: 'Café-Manager' }), tile({ name: 'Node-RED' })];
    expect(searchTiles(list, 'cafe').map((t) => t.name)).toEqual(['Café-Manager']);
    expect(searchTiles(list, 'man').map((t) => t.name)).toEqual(['Café-Manager']);
    expect(searchTiles(list, 'red').map((t) => t.name)).toEqual(['Node-RED']);
  });

  it('limits the number of results', () => {
    const many = Array.from({ length: 40 }, (_, i) => tile({ id: `c/a/ns/${i}`, name: `app ${i}` }));
    expect(searchTiles(many, 'app')).toHaveLength(12);
    expect(searchTiles(many, 'app', 3)).toHaveLength(3);
  });
});

describe('webQuery', () => {
  it('recognises a web search', () => {
    expect(webQuery('?kubernetes ingress')).toBe('kubernetes ingress');
    expect(webQuery('  ? spaced ')).toBe('spaced');
    expect(webQuery('?')).toBe('');
    expect(webQuery('grafana')).toBeNull();
  });
});
