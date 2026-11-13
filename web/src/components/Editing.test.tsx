import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/preact';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { editKey, editMode, editTarget, reloadEditKey } from '../editing';
import { setLanguage } from '../i18n';
import { reloadPrefs } from '../prefs';
import { reset } from '../state';
import { FakeStream, openFake, serverState, tile } from '../testing';
import type { ServerState } from '../types';
import { App } from './App';
import { Editor, Unlock } from './Editing';

type Call = [string, RequestInit & { headers: Record<string, string> }];
// A server that answers by method and path.
function server(routes: Record<string, () => Response>) {
  const calls: Call[] = [];
  const fetcher = vi.fn(async (url: string, init: RequestInit = {}) => {
    calls.push([url, init as Call[1]]);
    const route = routes[`${init.method ?? 'GET'} ${url}`];
    return route ? route() : new Response(JSON.stringify({ version: 'test' }), { status: 200 });
  });
  return { calls, fetcher: fetcher as unknown as typeof fetch };
}
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status });

beforeEach(async () => {
  reset();
  FakeStream.opened = [];
  window.localStorage.clear();
  reloadPrefs();
  reloadEditKey();
  editTarget.value = null;
  editMode.value = false;
  await setLanguage('en-US');
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const field = (name: string | RegExp) => screen.getByLabelText(name) as HTMLInputElement;
const type = (name: string | RegExp, value: string) => fireEvent.input(field(name), { target: { value } });

describe('Unlock', () => {
  it('keeps the key the server accepts and closes', async () => {
    const { fetcher, calls } = server({ 'GET /api/v1/unlock': () => new Response(null, { status: 204 }) });
    const onClose = vi.fn();
    render(<Unlock onClose={onClose} fetcher={fetcher} />);
    expect(field('Edit key').type).toBe('password');
    type('Edit key', 'the right key');
    fireEvent.click(screen.getByRole('button', { name: 'Unlock' }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(calls[0]![1].headers.Authorization).toBe('Bearer the right key');
    expect(editKey.value).toBe('the right key');
  });

  it('says so when the key is wrong, and stays open', async () => {
    const { fetcher } = server({ 'GET /api/v1/unlock': () => json(401, { error: 'no' }) });
    const onClose = vi.fn();
    render(<Unlock onClose={onClose} fetcher={fetcher} />);
    type('Edit key', 'a guess');
    fireEvent.click(screen.getByRole('button', { name: 'Unlock' }));
    expect((await screen.findByRole('alert')).textContent).toBe('That is not the edit key.');
    expect(onClose).not.toHaveBeenCalled();
    expect(editKey.value).toBeNull();
  });
});

describe('Editor', () => {
  beforeEach(() => {
    editKey.value = 'the right key';
  });

  it('creates an application from what was filled in', async () => {
    const { fetcher, calls } = server({ 'POST /api/v1/applications': () => json(201, {}) });
    const onClose = vi.fn();
    render(<Editor target={{ kind: 'applications' }} namespace="home" onClose={onClose} fetcher={fetcher} />);
    expect(screen.getByRole('heading', { name: 'Add an application' })).toBeTruthy();
    expect(screen.getByText('It is created in the namespace home.')).toBeTruthy();
    // Nothing to delete yet.
    expect(screen.queryByRole('button', { name: 'Delete' })).toBeNull();
    expect(field('Name').required).toBe(true);
    type('Name', 'Grafana');
    type('Address', 'https://grafana.example.com');
    type(/^Icon(?! colour)/, 'mdi:chart-line');
    fireEvent.click(field('Open in a new tab'));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(JSON.parse(calls[0]![1].body as string)).toEqual({
      spec: { name: 'Grafana', url: 'https://grafana.example.com', icon: 'mdi:chart-line', targetBlank: true },
    });
  });

  it('says what is wrong next to the field, and does not send it', async () => {
    const { fetcher, calls } = server({ 'POST /api/v1/applications': () => json(201, {}) });
    const onClose = vi.fn();
    render(<Editor target={{ kind: 'applications' }} namespace="home" onClose={onClose} fetcher={fetcher} />);
    // Nothing is complained about before anything was done.
    expect(screen.queryByText('This is needed.')).toBeNull();
    type('Address', 'grafana.example.com');
    fireEvent.blur(field('Address'));
    expect(screen.getByText('An address starts with http:// or https://.')).toBeTruthy();
    expect(field('Address').getAttribute('aria-invalid')).toBe('true');
    type(/^Position/, 'first');
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    // Sending shows the rest, and goes to the first field that is wrong.
    expect(screen.getByText('This is needed.')).toBeTruthy();
    expect(screen.getByText('A whole number.')).toBeTruthy();
    expect(document.activeElement).toBe(field('Name'));
    expect(calls.filter(([, init]) => init.method === 'POST')).toHaveLength(0);
    expect(onClose).not.toHaveBeenCalled();

    type('Name', 'Grafana');
    type('Address', 'https://grafana.example.com');
    type(/^Position/, '20');
    expect(screen.queryByText(/This is needed|An address starts|A whole number/)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(JSON.parse(calls.find(([, init]) => init.method === 'POST')![1].body as string)).toEqual({
      spec: { name: 'Grafana', url: 'https://grafana.example.com', location: 20 },
    });
  });

  it('says whether the address answers, and saves either way', async () => {
    let available = false;
    const { fetcher, calls } = server({
      'POST /api/v1/check': () => json(200, { available }),
      'POST /api/v1/applications': () => json(201, {}),
    });
    const onClose = vi.fn();
    render(<Editor target={{ kind: 'applications' }} namespace="home" onClose={onClose} fetcher={fetcher} />);
    type('Name', 'Grafana');
    // Not asked about what is not an address.
    type('Address', 'https://');
    expect(screen.queryByText(/Checking the address|answers at this address/)).toBeNull();
    type('Address', 'https://down.example.com');
    expect(screen.getByText('Checking the address…')).toBeTruthy();
    expect(await screen.findByText(/Nothing answers at this address/, undefined, { timeout: 3000 })).toBeTruthy();
    expect(JSON.parse(calls.find(([url]) => url === '/api/v1/check')![1].body as string)).toEqual({ url: 'https://down.example.com' });
    available = true;
    type('Address', 'https://up.example.com');
    expect(await screen.findByText('Something answers at this address.', undefined, { timeout: 3000 })).toBeTruthy();
    available = false;
    type('Address', 'https://down.example.com');
    await screen.findByText(/Nothing answers at this address/, undefined, { timeout: 3000 });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it('offers the groups in use, takes tags as pills and finds icons', async () => {
    act(() =>
      FakeStream.last?.emit?.('snapshot', serverState()),
    );
    const { fetcher, calls } = server({
      'GET /api/v1/icons?query=grafana': () => json(200, { icons: ['simple-icons:grafana', 'logos:grafana'] }),
      'POST /api/v1/applications': () => json(201, {}),
    });
    const onClose = vi.fn();
    render(<Editor target={{ kind: 'applications' }} namespace="home" onClose={onClose} fetcher={fetcher} />);
    type('Name', 'Grafana dashboards');
    type('Address', 'https://grafana.example.com');
    // A group can be picked or typed.
    expect(field(/^Group/).getAttribute('list')).toBe('editor-groups');
    type(/^Group/, 'Brand new');

    // Tags: Enter or a comma ends one, a pill can be removed, Backspace
    // takes the last.
    const tags = field('Tags');
    fireEvent.input(tags, { target: { value: 'admin' } });
    fireEvent.keyDown(tags, { key: 'Enter' });
    fireEvent.input(tags, { target: { value: 'media, home,' } });
    expect(screen.getByRole('button', { name: 'Remove the tag admin' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Remove the tag media' }));
    fireEvent.input(tags, { target: { value: 'ops' } });
    fireEvent.keyDown(tags, { key: 'Enter' });
    fireEvent.keyDown(tags, { key: 'Backspace' });
    expect(screen.queryByRole('button', { name: 'Remove the tag ops' })).toBeNull();
    // What is still being typed counts when the field is left.
    fireEvent.input(tags, { target: { value: 'lab' } });
    fireEvent.blur(tags);
    expect(screen.getAllByRole('button', { name: /^Remove the tag / }).map((b) => b.getAttribute('aria-label'))).toEqual([
      'Remove the tag admin',
      'Remove the tag home',
      'Remove the tag lab',
    ]);

    // The colour: a ready one, the browser's picker, or typed.
    fireEvent.click(screen.getByRole('button', { name: '#1e88e5' }));
    expect(field(/^Icon colour/).value).toBe('#1e88e5');
    expect(screen.getByRole('button', { name: '#1e88e5' }).getAttribute('aria-pressed')).toBe('true');
    expect((screen.getByLabelText('Pick a colour') as HTMLInputElement).value).toBe('#1e88e5');
    fireEvent.input(screen.getByLabelText('Pick a colour'), { target: { value: '#123456' } });
    expect(field(/^Icon colour/).value).toBe('#123456');
    fireEvent.click(screen.getByRole('button', { name: 'None' }));
    expect(field(/^Icon colour/).value).toBe('');
    fireEvent.click(screen.getByRole('button', { name: '#43a047' }));

    // The icon search opens on the first word of the name.
    fireEvent.click(screen.getByRole('button', { name: 'Choose an icon' }));
    expect((screen.getByRole('searchbox', { name: 'Search icons' }) as HTMLInputElement).value).toBe('grafana');
    fireEvent.click(await screen.findByRole('button', { name: 'simple-icons:grafana' }, { timeout: 3000 }));
    expect(field('Icon').value).toBe('simple-icons:grafana');
    expect(screen.queryByRole('searchbox', { name: 'Search icons' })).toBeNull();
    // The picked icon is shown, from this instance.
    expect(document.querySelector('.icon-preview img')?.getAttribute('src')).toContain('/api/v1/icons/simple-icons/grafana.svg');

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(JSON.parse(calls.find(([, init]) => init.method === 'POST')![1].body as string)).toEqual({
      spec: {
        name: 'Grafana dashboards',
        url: 'https://grafana.example.com',
        group: 'Brand new',
        icon: 'simple-icons:grafana',
        iconColor: '#43a047',
        tags: 'admin, home, lab',
      },
    });
  });

  it('lets a new one be of the other kind, keeping what was filled in', async () => {
    const { fetcher, calls } = server({ 'POST /api/v1/bookmarks': () => json(201, {}) });
    const onClose = vi.fn();
    render(<Editor target={{ kind: 'applications' }} namespace="home" onClose={onClose} fetcher={fetcher} />);
    type('Name', 'Docs');
    type('Address', 'https://docs.example.com');
    fireEvent.change(field('Kind'), { target: { value: 'bookmarks' } });
    expect(await screen.findByRole('heading', { name: 'Add a bookmark' })).toBeTruthy();
    // A bookmark has to name its group, and has no tags.
    expect(field('Group').required).toBe(true);
    expect(screen.queryByLabelText(/^Tags/)).toBeNull();
    expect(field('Name').value).toBe('Docs');
    type('Group', 'Reading');
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(calls[0]![0]).toBe('/api/v1/bookmarks');
    expect(JSON.parse(calls[0]![1].body as string)).toEqual({
      spec: { name: 'Docs', url: 'https://docs.example.com', group: 'Reading' },
    });
  });

  it('loads a bookmark, changes it and keeps what it does not show', async () => {
    const spec = { name: 'Docs', group: 'Reference', url: 'https://example.com/docs', info: 'Old words' };
    const { fetcher, calls } = server({
      'GET /api/v1/bookmarks/links/docs': () => json(200, { namespace: 'links', name: 'docs', spec }),
      'PUT /api/v1/bookmarks/links/docs': () => json(200, {}),
    });
    const onClose = vi.fn();
    render(<Editor target={{ kind: 'bookmarks', namespace: 'links', name: 'docs' }} namespace="home" onClose={onClose} fetcher={fetcher} />);
    expect(screen.getByRole('status').textContent).toBe('Loading…');
    await waitFor(() => expect(field('Name').value).toBe('Docs'));
    expect(screen.getByText('docs in the namespace links.')).toBeTruthy();
    // A bookmark has no tags and has to name its group.
    expect(screen.queryByLabelText(/^Tags/)).toBeNull();
    expect(field('Group').required).toBe(true);
    type('Description', '');
    type('Name', 'Documentation');
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    const put = calls.find(([, init]) => init.method === 'PUT')!;
    expect(JSON.parse(put[1].body as string)).toEqual({
      spec: { name: 'Documentation', group: 'Reference', url: 'https://example.com/docs' },
    });
  });

  it('does not ask for an address that is read from another object', async () => {
    const spec = { name: 'Console', urlFrom: { apiVersion: 'v1', kind: 'Service', name: 'console', property: 'spec.clusterIP' } };
    const { fetcher, calls } = server({
      'GET /api/v1/applications/home/console': () => json(200, { namespace: 'home', name: 'console', spec }),
      'PUT /api/v1/applications/home/console': () => json(200, {}),
    });
    render(<Editor target={{ kind: 'applications', namespace: 'home', name: 'console' }} namespace="home" onClose={vi.fn()} fetcher={fetcher} />);
    await waitFor(() => expect(field('Name').value).toBe('Console'));
    expect(field(/^Address/).required).toBe(false);
    expect(screen.getByText(/The address is read from the Service console/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(calls.some(([, init]) => init.method === 'PUT')).toBe(true));
    expect(JSON.parse(calls.find(([, init]) => init.method === 'PUT')![1].body as string).spec.urlFrom).toEqual(spec.urlFrom);
  });

  it('shows why the server refused, and stays open', async () => {
    const { fetcher } = server({ 'POST /api/v1/bookmarks': () => json(400, { error: 'url must be an http or https address' }) });
    const onClose = vi.fn();
    render(<Editor target={{ kind: 'bookmarks' }} namespace="home" onClose={onClose} fetcher={fetcher} />);
    type('Name', 'x');
    type('Group', 'g');
    type('Address', 'https://x.example.com');
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect((await screen.findByRole('alert')).textContent).toBe('url must be an http or https address');
    expect(onClose).not.toHaveBeenCalled();
    // And can be tried again.
    expect((screen.getByRole('button', { name: 'Save' }) as HTMLButtonElement).disabled).toBe(false);
  });

  it('deletes only after being asked twice', async () => {
    const { fetcher, calls } = server({
      'GET /api/v1/applications/home/grafana': () => json(200, { namespace: 'home', name: 'grafana', spec: { name: 'Grafana', url: 'https://g.example.com' } }),
      'DELETE /api/v1/applications/home/grafana': () => new Response(null, { status: 204 }),
    });
    const onClose = vi.fn();
    render(<Editor target={{ kind: 'applications', namespace: 'home', name: 'grafana' }} namespace="home" onClose={onClose} fetcher={fetcher} />);
    await waitFor(() => expect(field('Name').value).toBe('Grafana'));
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(calls.some(([, init]) => init.method === 'DELETE')).toBe(false);
    // Changing one's mind.
    fireEvent.click(screen.getByRole('button', { name: 'No' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    fireEvent.click(screen.getByRole('button', { name: 'Yes, delete' }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(calls.some(([, init]) => init.method === 'DELETE')).toBe(true);
  });
});

describe('the page', () => {
  const source = { type: 'applications.startpunkt.ullberg.us', version: 'v1', namespace: 'home', name: 'grafana' };
  const state = (available: boolean): ServerState =>
    serverState({
      editing: available ? { available: true, namespace: 'home' } : { available: false },
      clusters: [
        { name: 'local', local: true, state: 'connected' },
        { name: 'prod', local: false, state: 'connected' },
      ],
      tiles: [
        tile({ id: 'local/a/home/grafana', name: 'Grafana', cluster: 'local', source }),
        tile({ id: 'local/r/home/wiki', name: 'Wiki', cluster: 'local', source: { ...source, type: 'routes.route.openshift.io', name: 'wiki' }, editable: false }),
        tile({ id: 'prod/a/home/plex', name: 'Plex', cluster: 'prod', source: { ...source, name: 'plex' }, editable: false }),
      ],
    });
  const show = (s: ServerState) => {
    render(<App open={openFake} />);
    act(() => FakeStream.last.emit('snapshot', s));
  };

  it('has no lock when the instance has no edit key', async () => {
    vi.stubGlobal('fetch', server({}).fetcher);
    editKey.value = 'left over from another time';
    show(state(false));
    await screen.findByRole('link', { name: /Grafana/ });
    fireEvent.click(screen.getByRole('button', { name: 'Edit the page' }));
    expect(screen.queryByRole('button', { name: /ock editing$/ })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Add' })).toBeNull();
    expect(screen.queryByRole('button', { name: /^Change / })).toBeNull();
  });

  it('unlocks with the key, and then offers to change what can be changed', async () => {
    const { fetcher, calls } = server({
      'GET /api/v1/unlock': () => new Response(null, { status: 204 }),
      'GET /api/v1/applications/home/grafana': () => json(200, { namespace: 'home', name: 'grafana', spec: { name: 'Grafana', url: 'https://g.example.com' } }),
    });
    vi.stubGlobal('fetch', fetcher);
    show(state(true));
    await screen.findByRole('link', { name: /Grafana/ });
    // The lock and the button that adds are part of editing the page.
    expect(screen.queryByRole('button', { name: 'Unlock editing' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Add' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Edit the page' }));
    // Locked: nothing to change.
    expect(screen.queryByRole('button', { name: /^Change / })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Unlock editing' }));
    type('Edit key', 'the right key');
    fireEvent.click(screen.getByRole('button', { name: 'Unlock' }));
    const lockButton = await screen.findByRole('button', { name: 'Lock editing' });

    // Only the Application of this cluster: not the Route, not the remote.
    expect(screen.getAllByRole('button', { name: /^Change / }).map((b) => b.getAttribute('aria-label'))).toEqual(['Change Grafana']);
    fireEvent.click(screen.getByRole('button', { name: 'Change Grafana' }));
    const dialog = await screen.findByRole('dialog', { name: 'Change application' });
    await waitFor(() => expect((within(dialog).getByLabelText('Name') as HTMLInputElement).value).toBe('Grafana'));
    expect(calls.some(([url]) => url === '/api/v1/applications/home/grafana')).toBe(true);
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Change application' })).toBeNull());

    // Adding opens an empty form for the kind that is shown.
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    expect(await screen.findByRole('dialog', { name: 'Add an application' })).toBeTruthy();

    // Locking takes all of it away again.
    fireEvent.click(lockButton);
    await waitFor(() => expect(screen.queryByRole('button', { name: /^Change / })).toBeNull());
    expect(screen.queryByRole('dialog', { name: 'Add an application' })).toBeNull();
    expect(window.localStorage.getItem('startpunkt.editKey')).toBeNull();
  });

  it('asks for the key when something is added on a locked page, and then goes on', async () => {
    vi.stubGlobal('fetch', server({ 'GET /api/v1/unlock': () => new Response(null, { status: 204 }) }).fetcher);
    show(state(true));
    await screen.findByRole('link', { name: /Grafana/ });
    fireEvent.click(screen.getByRole('button', { name: 'Edit the page' }));
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    type('Edit key', 'the right key');
    fireEvent.click(screen.getByRole('button', { name: 'Unlock' }));
    expect(await screen.findByRole('dialog', { name: 'Add an application' })).toBeTruthy();
  });

  it('keeps the key but hides the controls when editing is left', async () => {
    vi.stubGlobal('fetch', server({}).fetcher);
    window.localStorage.setItem('startpunkt.editKey', 'the right key');
    reloadEditKey();
    show(state(true));
    await screen.findByRole('link', { name: /Grafana/ });
    expect(screen.queryByRole('button', { name: /^Change / })).toBeNull();
    expect(document.documentElement.dataset.boxes).toBe('false');
    fireEvent.click(screen.getByRole('button', { name: 'Edit the page' }));
    // The whole tile is what is clicked to change it: it is a button in
    // place of its link, and every tile has its box. A tile that cannot be
    // changed stays a link.
    const change = screen.getByRole('button', { name: 'Change Grafana' });
    expect(change.textContent).toContain('Grafana');
    expect(change.closest('.tile')).not.toBeNull();
    expect(screen.queryByRole('link', { name: /Grafana/ })).toBeNull();
    expect(screen.getByRole('link', { name: /Wiki/ })).toBeTruthy();
    await waitFor(() => expect(document.documentElement.dataset.boxes).toBe('true'));
    fireEvent.click(screen.getByRole('button', { name: 'Done editing' }));
    expect(screen.queryByRole('button', { name: /^Change / })).toBeNull();
    expect(screen.getByRole('link', { name: /Grafana/ })).toBeTruthy();
    await waitFor(() => expect(document.documentElement.dataset.boxes).toBe('false'));
    expect(editKey.value).toBe('the right key');
  });
});
