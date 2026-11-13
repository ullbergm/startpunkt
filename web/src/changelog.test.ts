import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchChangelog, newerVersion, parseVersion, releasesBetween, rememberVersion, seenVersion } from './changelog';

const release = (version: string) => ({ version, sections: [{ title: 'Features', changes: [`change in ${version}`] }] });
const answer = (body: unknown, status = 200) =>
  vi.fn(async () => new Response(JSON.stringify(body), { status })) as unknown as typeof fetch;

beforeEach(() => window.localStorage.clear());

describe('versions', () => {
  it('reads release versions and nothing else', () => {
    expect(parseVersion('5.2.0')).toEqual([5, 2, 0]);
    expect(parseVersion('v5.2.0-rc.1')).toEqual([5, 2, 0]);
    expect(parseVersion('dev')).toBeNull();
    expect(parseVersion('5.2')).toBeNull();
  });

  it('compares by number, not by text', () => {
    expect(newerVersion('5.10.0', '5.9.0')).toBe(true);
    expect(newerVersion('v5.2.0', '5.2.0')).toBe(false);
    expect(newerVersion('5.1.9', '5.2.0')).toBe(false);
    expect(newerVersion('dev', '5.2.0')).toBe(false);
    expect(newerVersion('5.2.0', 'dev')).toBe(false);
  });

  it('picks the releases after one version and up to another', () => {
    const all = ['5.3.0', '5.2.0', '5.1.0', '5.0.0', 'odd'].map(release);
    expect(releasesBetween(all, '5.0.0', '5.2.0').map((r) => r.version)).toEqual(['5.2.0', '5.1.0']);
    expect(releasesBetween(all, null, 'v5.1.0').map((r) => r.version)).toEqual(['5.1.0', '5.0.0']);
    expect(releasesBetween(all, '5.3.0', '5.3.0')).toEqual([]);
  });
});

describe('fetchChangelog', () => {
  it('keeps what has the expected shape and drops the rest', async () => {
    const fetcher = answer({
      releases: [
        { version: '5.2.0', date: '2026-11-13', sections: [{ title: 'Features', changes: ['one', 2, 'two'] }, { title: 'Empty', changes: [] }] },
        { version: 5, sections: [] },
        { version: '5.1.0', sections: 'none' },
        null,
        { version: '5.0.0', sections: [{ changes: ['untitled'] }] },
      ],
    });
    expect(await fetchChangelog(fetcher)).toEqual([
      { version: '5.2.0', date: '2026-11-13', sections: [{ title: 'Features', changes: ['one', 'two'] }] },
      { version: '5.0.0', date: undefined, sections: [{ title: '', changes: ['untitled'] }] },
    ]);
    expect(fetcher).toHaveBeenCalledWith('/api/v1/changelog');
  });

  it('is empty when the server has none or cannot be reached', async () => {
    expect(await fetchChangelog(answer({ error: 'not found' }, 404))).toEqual([]);
    expect(await fetchChangelog(answer({ releases: 'no' }))).toEqual([]);
    expect(await fetchChangelog(vi.fn(async () => Promise.reject(new Error('down'))) as unknown as typeof fetch)).toEqual([]);
  });
});

describe('the version last seen', () => {
  it('is remembered in the browser', () => {
    expect(seenVersion()).toBeNull();
    rememberVersion('5.2.0');
    expect(seenVersion()).toBe('5.2.0');
    expect(window.localStorage.getItem('startpunkt.seenVersion')).toBe('5.2.0');
  });
});
