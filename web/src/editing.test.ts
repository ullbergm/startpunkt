import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  deleteResource,
  editKey,
  editTarget,
  loadResource,
  lock,
  reloadEditKey,
  saveResource,
  targetOf,
  toForm,
  toSpec,
  unlock,
  unlocked,
} from './editing';
import { tile } from './testing';

const answer = (status: number, body?: unknown) =>
  vi.fn(async () => new Response(body === undefined ? null : JSON.stringify(body), { status })) as unknown as typeof fetch;
const calls = (fetcher: typeof fetch) => (fetcher as unknown as ReturnType<typeof vi.fn>).mock.calls;

beforeEach(() => {
  window.localStorage.clear();
  reloadEditKey();
  editTarget.value = null;
});

describe('the edit key', () => {
  it('is kept once the server accepts it, and forgotten on lock', async () => {
    expect(unlocked.value).toBe(false);
    const fetcher = answer(204);
    expect(await unlock('the right key', fetcher)).toBe('ok');
    expect(calls(fetcher)[0]![0]).toBe('/api/v1/unlock');
    expect(calls(fetcher)[0]![1].headers.Authorization).toBe('Bearer the right key');
    expect(unlocked.value).toBe(true);
    // It survives a reload of the page.
    editKey.value = null;
    reloadEditKey();
    expect(editKey.value).toBe('the right key');

    editTarget.value = { kind: 'applications' };
    lock();
    expect(unlocked.value).toBe(false);
    expect(editTarget.value).toBeNull();
    reloadEditKey();
    expect(editKey.value).toBeNull();
  });

  it('is not kept when the server refuses it or cannot be asked', async () => {
    expect(await unlock('a guess', answer(401))).toBe('wrong');
    expect(await unlock('a guess', answer(429))).toBe('limited');
    expect(await unlock('a guess', answer(404))).toBe('failed');
    expect(await unlock('a guess', vi.fn(async () => Promise.reject(new Error('offline'))) as unknown as typeof fetch)).toBe('failed');
    expect(unlocked.value).toBe(false);
    expect(window.localStorage.length).toBe(0);
  });
});

describe('requests', () => {
  beforeEach(async () => {
    await unlock('the right key', answer(204));
  });

  it('carry the key and address the resource', async () => {
    const target = { kind: 'applications' as const, namespace: 'home', name: 'grafana' };
    const load = answer(200, { namespace: 'home', name: 'grafana', spec: { name: 'Grafana' } });
    expect((await loadResource(target, load)).spec).toEqual({ name: 'Grafana' });
    expect(calls(load)[0]![0]).toBe('/api/v1/applications/home/grafana');
    expect(calls(load)[0]![1].headers.Authorization).toBe('Bearer the right key');

    const save = answer(200, {});
    await saveResource(target, { name: 'Grafana 2' }, save);
    expect(calls(save)[0]![1].method).toBe('PUT');
    expect(JSON.parse(calls(save)[0]![1].body)).toEqual({ spec: { name: 'Grafana 2' } });

    const create = answer(201, {});
    await saveResource({ kind: 'bookmarks' }, { name: 'Docs' }, create);
    expect(calls(create)[0]![0]).toBe('/api/v1/bookmarks');
    expect(calls(create)[0]![1].method).toBe('POST');

    const remove = answer(204);
    await deleteResource(target, remove);
    expect(calls(remove)[0]![1].method).toBe('DELETE');
  });

  it("pass on the server's reason when it refuses", async () => {
    await expect(saveResource({ kind: 'applications' }, {}, answer(400, { error: 'name is required' }))).rejects.toThrow(
      'name is required',
    );
    expect(unlocked.value).toBe(true);
  });

  it('lock the page when the key is no longer accepted', async () => {
    await expect(saveResource({ kind: 'applications' }, {}, answer(401, { error: 'no' }))).rejects.toThrow('locked');
    expect(unlocked.value).toBe(false);
    // And nothing is sent without a key.
    const fetcher = answer(200, {});
    await expect(saveResource({ kind: 'applications' }, {}, fetcher)).rejects.toThrow('locked');
    expect(calls(fetcher)).toHaveLength(0);
  });
});

describe('what can be changed', () => {
  it('is an Application or a Bookmark of this cluster', () => {
    const source = { type: 'applications.startpunkt.ullberg.us', version: 'v1', namespace: 'home', name: 'grafana' };
    expect(targetOf(tile({ source }))).toEqual({ kind: 'applications', namespace: 'home', name: 'grafana' });
    expect(targetOf(tile({ source: { ...source, type: 'bookmarks.startpunkt.ullberg.us' } }))?.kind).toBe('bookmarks');
    // A tile of a remote is never editable, and a Route is not a resource
    // of ours to change.
    expect(targetOf(tile({ source, editable: false }))).toBeNull();
    expect(targetOf(tile({ source: { ...source, type: 'routes.route.openshift.io' } }))).toBeNull();
  });
});

describe('the form', () => {
  it('starts from the spec', () => {
    const form = toForm('applications', { name: 'Grafana', location: 5, targetBlank: true, enabled: false });
    expect(form).toMatchObject({ name: 'Grafana', location: '5', targetBlank: true, enabled: false, url: '', tags: '' });
    // A tile is shown unless its spec says otherwise.
    expect(toForm('applications', {}).enabled).toBe(true);
    expect('enabled' in toForm('bookmarks', {})).toBe(false);
  });

  it('becomes a spec without the fields that were emptied', () => {
    const base = { name: 'Old', info: 'to be removed', urlFrom: { kind: 'Service', name: 's' }, location: 3 };
    const spec = toSpec('applications', base, {
      name: '  Grafana ',
      url: 'https://grafana.example.com',
      group: '',
      info: '',
      icon: 'mdi:chart-line',
      iconColor: '',
      tags: 'a,b',
      rootPath: '',
      location: '',
      targetBlank: false,
      enabled: true,
    });
    expect(spec).toEqual({
      name: 'Grafana',
      url: 'https://grafana.example.com',
      icon: 'mdi:chart-line',
      tags: 'a,b',
      // What the form does not show stays as it was.
      urlFrom: { kind: 'Service', name: 's' },
    });
    expect(base.info).toBe('to be removed');
  });

  it('writes only what differs from the defaults', () => {
    const spec = toSpec('applications', {}, { name: 'x', url: 'https://x.example.com', location: '7.9', targetBlank: true, enabled: false });
    expect(spec).toEqual({ name: 'x', url: 'https://x.example.com', location: 7, targetBlank: true, enabled: false });
    expect(toSpec('bookmarks', {}, { name: 'x', location: 'first' })).toEqual({ name: 'x' });
  });
});
