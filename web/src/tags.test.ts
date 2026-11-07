import { describe, expect, it } from 'vitest';
import { tile } from './group.test';
import { filterByTags, tagsFromPath } from './tags';

describe('tagsFromPath', () => {
  it('reads comma-separated tags from the first path segment', () => {
    expect(tagsFromPath('/')).toEqual([]);
    expect(tagsFromPath('')).toEqual([]);
    expect(tagsFromPath('/admin')).toEqual(['admin']);
    expect(tagsFromPath('/admin,dev')).toEqual(['admin', 'dev']);
    expect(tagsFromPath('/Admin,%20dev,,admin/')).toEqual(['admin', 'dev']);
    expect(tagsFromPath('/admin/ignored')).toEqual(['admin']);
  });

  it('survives invalid percent-encoding', () => {
    expect(tagsFromPath('/%E0%A4%A')).toEqual(['%e0%a4%a']);
  });
});

describe('filterByTags', () => {
  const tiles = [
    tile({ name: 'untagged' }),
    tile({ name: 'admin', tags: ['admin'] }),
    tile({ name: 'both', tags: ['admin', 'dev'] }),
    tile({ name: 'ops', tags: ['ops'] }),
  ];
  const names = (selected: string[]) => filterByTags(tiles, selected).map((t) => t.name);

  it('shows only untagged tiles without a filter', () => {
    expect(names([])).toEqual(['untagged']);
  });

  it('adds tiles that have one of the selected tags', () => {
    expect(names(['admin'])).toEqual(['untagged', 'admin', 'both']);
    expect(names(['dev', 'ops'])).toEqual(['untagged', 'both', 'ops']);
    expect(names(['other'])).toEqual(['untagged']);
  });
});
