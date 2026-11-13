import { computed, signal } from '@preact/signals';
import type { MessageKey } from './i18n';
import { serverState } from './state';
import type { Tile } from './types';

// Editing changes resources in the cluster, so it needs the edit key of the
// instance. The key is kept in this browser until the visitor locks the
// page again. Any script on the page could read it there, which is why the
// page loads none but its own and shows tile content as text.

const KEY = 'startpunkt.editKey';

function stored(): string | null {
  try {
    return window.localStorage.getItem(KEY) || null;
  } catch {
    return null;
  }
}

export const editKey = signal<string | null>(stored());
export const unlocked = computed(() => editKey.value !== null);
// Whether resources can be changed right now: the instance has editing on,
// and this browser holds a key. A key left over from a time when editing
// was on does not count.
export const canEdit = computed(() => unlocked.value && serverState.value?.editing.available === true);

// Whether the page is being arranged. Only then do tiles carry their
// controls: the star, the buttons that move a favorite and, with the key,
// the one that changes the resource. It lasts until the visitor leaves it
// or the page is closed.
export const editMode = signal(false);

// For tests, which change storage behind the module's back.
export function reloadEditKey(): void {
  editKey.value = stored();
}

function remember(key: string | null): void {
  editKey.value = key;
  try {
    if (key === null) {
      window.localStorage.removeItem(KEY);
    } else {
      window.localStorage.setItem(KEY, key);
    }
  } catch {
    // Without storage the key lasts until the page is closed.
  }
}

export function lock(): void {
  remember(null);
  editTarget.value = null;
}

export type UnlockResult = 'ok' | 'wrong' | 'limited' | 'failed';

// Asks the server whether the key is the right one, and keeps it if so.
export async function unlock(key: string, fetcher: typeof fetch = fetch): Promise<UnlockResult> {
  try {
    const response = await fetcher('/api/v1/unlock', { headers: { Authorization: `Bearer ${key}` } });
    if (response.status === 204) {
      remember(key);
      return 'ok';
    }
    if (response.status === 401) return 'wrong';
    if (response.status === 429) return 'limited';
    return 'failed';
  } catch {
    return 'failed';
  }
}

export type EditKind = 'applications' | 'bookmarks';

// The spec of an Application or a Bookmark. Fields the editor does not know
// are carried along untouched.
export type Spec = Record<string, unknown>;

export interface Resource {
  namespace: string;
  name: string;
  spec: Spec;
}

// What the editor is open on: a resource to change, or a new one of a kind.
export type EditTarget = { kind: EditKind; namespace?: string; name?: string };
export const editTarget = signal<EditTarget | null>(null);

const TYPES: Record<string, EditKind> = {
  'applications.startpunkt.ullberg.us': 'applications',
  'bookmarks.startpunkt.ullberg.us': 'bookmarks',
};

// The resource behind a tile, when it is one that can be changed from
// here: an Application or a Bookmark of this instance's own cluster.
export function targetOf(tile: Tile): EditTarget | null {
  const kind = TYPES[tile.source.type];
  if (!tile.editable || !kind) return null;
  return { kind, namespace: tile.source.namespace, name: tile.source.name };
}

// An error with a message that can be shown as it is.
export class EditError extends Error {}

async function call(method: string, path: string, body: unknown, fetcher: typeof fetch): Promise<Resource | null> {
  const key = editKey.value;
  if (key === null) throw new EditError('locked');
  let response: Response;
  try {
    response = await fetcher(`/api/v1/${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${key}`,
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new EditError('unreachable');
  }
  if (response.status === 401) {
    // The key was changed on the server. This one is of no use any more.
    lock();
    throw new EditError('locked');
  }
  if (response.status === 204) return null;
  let document: { error?: string } & Partial<Resource> = {};
  try {
    document = await response.json();
  } catch {
    // An answer without a body, from a proxy for example.
  }
  if (!response.ok) {
    throw new EditError(document.error || `${response.status}`);
  }
  return document as Resource;
}

const item = (target: EditTarget) =>
  `${target.kind}/${encodeURIComponent(target.namespace ?? '')}/${encodeURIComponent(target.name ?? '')}`;

export async function loadResource(target: EditTarget, fetcher: typeof fetch = fetch): Promise<Resource> {
  return (await call('GET', item(target), undefined, fetcher)) as Resource;
}

// Creates the resource when the target names none, otherwise replaces its
// spec.
export async function saveResource(target: EditTarget, spec: Spec, fetcher: typeof fetch = fetch): Promise<void> {
  if (target.name) {
    await call('PUT', item(target), { spec }, fetcher);
  } else {
    await call('POST', target.kind, { spec }, fetcher);
  }
}

export async function deleteResource(target: EditTarget, fetcher: typeof fetch = fetch): Promise<void> {
  await call('DELETE', item(target), undefined, fetcher);
}

// The fields the editor offers, per kind, in the order they are shown.
export type FieldType = 'text' | 'url' | 'number' | 'check';
export interface Field {
  name: string;
  type: FieldType;
  required?: boolean;
}

export const FIELDS: Record<EditKind, Field[]> = {
  applications: [
    { name: 'name', type: 'text', required: true },
    { name: 'url', type: 'url', required: true },
    { name: 'group', type: 'text' },
    { name: 'info', type: 'text' },
    { name: 'icon', type: 'text' },
    { name: 'iconColor', type: 'text' },
    { name: 'tags', type: 'text' },
    { name: 'rootPath', type: 'text' },
    { name: 'location', type: 'number' },
    { name: 'targetBlank', type: 'check' },
    { name: 'enabled', type: 'check' },
  ],
  bookmarks: [
    { name: 'name', type: 'text', required: true },
    { name: 'url', type: 'url', required: true },
    { name: 'group', type: 'text', required: true },
    { name: 'info', type: 'text' },
    { name: 'icon', type: 'text' },
    { name: 'location', type: 'number' },
    { name: 'targetBlank', type: 'check' },
  ],
};

// What the form holds: text for every field but the checkboxes.
export type FormValues = Record<string, string | boolean>;

// The form's starting values for a spec. A tile is enabled unless its spec
// says otherwise.
export function toForm(kind: EditKind, spec: Spec): FormValues {
  const values: FormValues = {};
  for (const field of FIELDS[kind]) {
    const value = spec[field.name];
    if (field.type === 'check') {
      values[field.name] = field.name === 'enabled' ? value !== false : value === true;
    } else {
      values[field.name] = value === undefined || value === null ? '' : String(value);
    }
  }
  return values;
}

// The spec to send for what the form holds, on top of the spec that was
// loaded: a field that was emptied is left out, and what the form does not
// show, such as urlFrom, stays as it was.
export function toSpec(kind: EditKind, base: Spec, values: FormValues): Spec {
  const spec: Spec = { ...base };
  for (const field of FIELDS[kind]) {
    const value = values[field.name];
    delete spec[field.name];
    if (field.type === 'check') {
      // Only what differs from the default is written.
      if (field.name === 'enabled' ? value === false : value === true) spec[field.name] = value;
    } else if (field.type === 'number') {
      const text = String(value ?? '').trim();
      if (text !== '' && Number.isFinite(Number(text))) spec[field.name] = Math.trunc(Number(text));
    } else {
      const text = String(value ?? '').trim();
      if (text !== '') spec[field.name] = text;
    }
  }
  return spec;
}

// What is wrong with what the form holds, per field, as the key of the
// message that says so. The server checks again when the form is sent; this
// is to say it next to the field, before that.
export type Problems = Record<string, MessageKey>;

const WHOLE = /^-?\d+$/;
const COLOUR = /^(?:#[0-9a-fA-F]{3,8}|[a-zA-Z]+)$/;

// Whether text is an address a tile may link to: http or https, with a host.
export function isAddress(text: string): boolean {
  try {
    const url = new URL(text.trim());
    return (url.protocol === 'http:' || url.protocol === 'https:') && url.hostname !== '';
  } catch {
    return false;
  }
}

// urlOptional is for an application whose address is read from another
// object: the one in the form is then only a fallback.
export function validate(kind: EditKind, values: FormValues, urlOptional = false): Problems {
  const problems: Problems = {};
  const text = (name: string) => String(values[name] ?? '').trim();
  for (const field of FIELDS[kind]) {
    if (field.type === 'check') continue;
    const value = text(field.name);
    const required = field.required && !(field.name === 'url' && urlOptional);
    if (value === '') {
      if (required) problems[field.name] = 'edit.invalid.required';
    } else if (field.type === 'url' && !isAddress(value)) {
      problems[field.name] = 'edit.invalid.url';
    } else if (field.type === 'number' && !WHOLE.test(value)) {
      problems[field.name] = 'edit.invalid.number';
    } else if (field.name === 'iconColor' && !COLOUR.test(value)) {
      problems[field.name] = 'edit.invalid.color';
    }
  }
  return problems;
}

// The tags of a field value, which is a list separated by commas.
export function splitTags(value: string): string[] {
  const tags: string[] = [];
  for (const part of value.split(',')) {
    const tag = part.trim();
    if (tag !== '' && !tags.includes(tag)) tags.push(tag);
  }
  return tags;
}

// Asks the server whether something answers at an address. null means it
// could not be asked, which says nothing about the address.
export async function checkAddress(url: string, fetcher: typeof fetch = fetch): Promise<boolean | null> {
  const key = editKey.value;
  if (key === null) return null;
  try {
    const response = await fetcher('/api/v1/check', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });
    if (!response.ok) return null;
    const answer = (await response.json()) as { available?: unknown };
    return typeof answer.available === 'boolean' ? answer.available : null;
  } catch {
    return null;
  }
}

const ICON_NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*:[a-z0-9]+(?:-[a-z0-9]+)*$/;

// The names of icons that match a word, as "set:name". A failure is an
// empty list.
export async function searchIcons(query: string, fetcher: typeof fetch = fetch): Promise<string[]> {
  try {
    const response = await fetcher(`/api/v1/icons?query=${encodeURIComponent(query)}`);
    if (!response.ok) return [];
    const answer = (await response.json()) as { icons?: unknown };
    return Array.isArray(answer.icons)
      ? answer.icons.filter((name): name is string => typeof name === 'string' && ICON_NAME.test(name))
      : [];
  } catch {
    return [];
  }
}
