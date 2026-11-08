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

  it('matches name, group, description, tags and host, without regard to case', () => {
    expect(names('PLEX')).toEqual(['Plex']);
    expect(names('media')).toEqual(['Plex']);
    expect(names('dashboards')).toEqual(['Grafana']);
    expect(names('home')).toEqual(['Plex']);
    expect(names('plex.example.com')).toEqual(['Plex']);
  });

  it('needs every word, and uses the cluster to tell tiles apart', () => {
    expect(ids('grafana prod')).toEqual(['prod/a/ns/grafana']);
    expect(ids('grafana nowhere')).toEqual([]);
  });

  it('puts names that start with the query first, then other name matches', () => {
    expect(names('grafana')).toEqual(['Grafana', 'Grafana', 'Grafana docs', 'Metrics']);
    expect(names('docs')).toEqual(['Grafana docs']);
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
