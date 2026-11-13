import { useEffect, useRef, useState } from 'preact/hooks';
import {
  checkAddress,
  deleteResource,
  EditError,
  FIELDS,
  isAddress,
  loadResource,
  lock,
  saveResource,
  toForm,
  toSpec,
  unlock,
  validate,
  type EditKind,
  type EditTarget,
  type Fixed as FixedTile,
  type FormValues,
  type Spec,
} from '../editing';
import { t, type MessageKey } from '../i18n';
import { serverState } from '../state';
import { safeHref } from '../url';
import { ColorPicker, IconPicker, TagsInput } from './EditorFields';
import { Icon } from './Icons';
import { Modal } from './Modal';

// The fields that come with a word of explanation.
const HINTS = ['group', 'icon', 'iconColor', 'tags', 'rootPath', 'location'];

// Turns a failure into words. The server's own messages are shown as they
// are: they say what is wrong with the input.
function explain(error: unknown): string {
  const message = error instanceof EditError ? error.message : '';
  if (message === 'locked') return t('edit.error.locked');
  if (message === 'unreachable' || message === '') return t('edit.error.unreachable');
  return message;
}

// Asks for the edit key.
export function Unlock({ onClose, fetcher }: { onClose: () => void; fetcher?: typeof fetch }) {
  const [key, setKey] = useState('');
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const submit = async (event: Event) => {
    event.preventDefault();
    if (key === '' || busy) return;
    setBusy(true);
    setProblem(null);
    const result = await unlock(key, fetcher);
    setBusy(false);
    if (result === 'ok') {
      onClose();
    } else {
      setProblem(t(`unlock.${result}` as MessageKey));
    }
  };
  return (
    <Modal label={t('unlock.title')} class="settings editor" onClose={onClose}>
      <header class="settings-header">
        <h2>{t('unlock.title')}</h2>
        <button type="button" class="d-btn d-btn-ghost d-btn-sm d-btn-circle" aria-label={t('settings.close')} onClick={onClose}>
          <Icon name="close" />
        </button>
      </header>
      <form class="settings-body" onSubmit={submit}>
        <p class="help">{t('unlock.help')}</p>
        {/* A password manager files a password under a user name. There is
            none to type, so it is given one to file the key under. */}
        <input type="text" name="username" autocomplete="username" value="startpunkt" readOnly hidden />
        <label class="field field-wide">
          <span>{t('unlock.key')}</span>
          <input
            type="password"
            class="d-input"
            value={key}
            // A password manager may offer it, as it would a password.
            autocomplete="current-password"
            required
            onInput={(event) => setKey(event.currentTarget.value)}
          />
        </label>
        {problem && (
          <p class="d-alert d-alert-error d-alert-soft form-error" role="alert">
            {problem}
          </p>
        )}
        <div class="form-actions">
          <button type="submit" class="d-btn d-btn-primary" disabled={busy || key === ''}>
            {t('unlock.submit')}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// Creates or changes one Application or Bookmark.
export function Editor({
  target,
  namespace,
  onClose,
  fetcher,
}: {
  target: EditTarget;
  // Where a new resource is created.
  namespace: string;
  onClose: () => void;
  fetcher?: typeof fetch;
}) {
  const existing = Boolean(target.name);
  // A new resource is of the kind it was opened for until another is
  // chosen. What was filled in stays, where the other kind has the field.
  const [kind, setKind] = useState<EditKind>(target.kind);
  const [base, setBase] = useState<Spec | null>(existing ? null : {});
  const [values, setValues] = useState<FormValues>(() => ({
    ...toForm('applications', {}),
    ...toForm('bookmarks', {}),
  }));
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!existing) return;
    let current = true;
    loadResource(target, fetcher)
      .then((resource) => {
        if (!current) return;
        setBase(resource.spec ?? {});
        setValues(toForm(target.kind, resource.spec ?? {}));
      })
      .catch((error) => current && setProblem(explain(error)));
    return () => {
      current = false;
    };
  }, [target.kind, target.namespace, target.name]);

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setProblem(null);
    try {
      await action();
      // The change shows on the page when the cluster reports it, the same
      // way as a change made with kubectl.
      onClose();
    } catch (error) {
      setProblem(explain(error));
      setBusy(false);
    }
  };
  // An address that is read from another object does not have to be given.
  const urlFrom = base?.urlFrom as { kind?: string; name?: string } | undefined;
  const problems = validate(kind, values, Boolean(urlFrom));
  // A problem is said next to its field once the field has been left, or
  // the form was sent with it.
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [sent, setSent] = useState(false);
  const form = useRef<HTMLFormElement>(null);
  const submit = (event: Event) => {
    event.preventDefault();
    if (base === null || busy) return;
    const wrong = FIELDS[kind].find((field) => problems[field.name]);
    if (wrong) {
      setSent(true);
      form.current?.querySelector<HTMLElement>(`[data-field="${wrong.name}"] input`)?.focus();
      return;
    }
    void run(() => saveResource({ ...target, kind }, toSpec(kind, base, values), fetcher));
  };

  // Whether something answers at the address, asked a moment after it was
  // last changed. It is said next to the field and never stops a save: a
  // service may be down, or only reachable from elsewhere.
  const address = String(values.url ?? '').trim();
  const [reach, setReach] = useState<'checking' | 'up' | 'down' | null>(null);
  useEffect(() => {
    if (base === null || !isAddress(address)) {
      setReach(null);
      return;
    }
    let current = true;
    setReach('checking');
    const timer = setTimeout(() => {
      void checkAddress(address, fetcher).then((answers) => {
        if (current) setReach(answers === null ? null : answers ? 'up' : 'down');
      });
    }, 600);
    return () => {
      current = false;
      clearTimeout(timer);
    };
  }, [address, base === null]);

  // What is already on the page, to pick from: the groups of this kind of
  // tile, and the tags.
  const tiles = serverState.value?.tiles ?? [];
  const wanted = kind === 'applications' ? 'application' : 'bookmark';
  const groups = [...new Set(tiles.filter((tile) => tile.kind === wanted).map((tile) => tile.group))].sort((a, b) =>
    a.localeCompare(b),
  );
  const tags = [...new Set(tiles.flatMap((tile) => tile.tags))].sort((a, b) => a.localeCompare(b));

  const title = t(`edit.${existing ? 'change' : 'add'}.${kind}` as MessageKey);
  const set = (name: string, value: string | boolean) => setValues({ ...values, [name]: value });
  return (
    <Modal label={title} class="settings editor" onClose={onClose}>
      <header class="settings-header">
        <h2>{title}</h2>
        <button type="button" class="d-btn d-btn-ghost d-btn-sm d-btn-circle" aria-label={t('settings.close')} onClick={onClose}>
          <Icon name="close" />
        </button>
      </header>
      {/* The form says itself what is wrong, next to the field, in place of
          the browser's own bubbles. */}
      <form ref={form} class="settings-body" noValidate onSubmit={submit}>
        <p class="help">
          {existing
            ? t('edit.where.existing', { namespace: target.namespace ?? '', name: target.name ?? '' })
            : t('edit.where.new', { namespace })}
        </p>
        {base === null && !problem && <p role="status">{t('edit.loading')}</p>}
        {!existing && (
          <label class="field field-wide">
            <span>{t('edit.kind')}</span>
            <select class="d-select" value={kind} onChange={(event) => setKind(event.currentTarget.value as EditKind)}>
              <option value="applications">{t('edit.kind.applications')}</option>
              <option value="bookmarks">{t('edit.kind.bookmarks')}</option>
            </select>
          </label>
        )}
        {base !== null &&
          FIELDS[kind].map((field) => {
            const label = t(`edit.field.${field.name}` as MessageKey);
            // A bookmark has to name its group, so the hint about the
            // default is for applications only.
            const explained = HINTS.includes(field.name) && !(field.name === 'group' && field.required);
            const hint = explained ? t(`edit.help.${field.name}` as MessageKey) : null;
            if (field.type === 'check') {
              return (
                <label class="field" key={field.name}>
                  <span>
                    {label}
                    {hint && <small>{hint}</small>}
                  </span>
                  <input
                    type="checkbox"
                    class="d-toggle d-toggle-primary"
                    checked={values[field.name] === true}
                    onChange={(event) => set(field.name, event.currentTarget.checked)}
                  />
                </label>
              );
            }
            const value = String(values[field.name] ?? '');
            const wrong = (sent || touched[field.name]) && problems[field.name];
            const required = field.required && !(field.name === 'url' && urlFrom);
            const hintId = `edit-${field.name}-hint`;
            const errorId = `edit-${field.name}-error`;
            const described = [hint ? hintId : '', wrong ? errorId : ''].filter(Boolean).join(' ') || undefined;
            const heading = (
              <span class={required ? 'field-needed' : undefined}>
                <span class="field-name">{label}</span>
                {hint && <small id={hintId}>{hint}</small>}
              </span>
            );
            const complaint = wrong && (
              <small class="field-error" id={errorId}>
                <Icon name="warning" size={14} /> {t(wrong)}
              </small>
            );
            // Tags and the icon have more than one control, so their name is
            // not a label around them: a click on it would go to the first.
            if (field.name === 'tags') {
              return (
                <div class="field field-wide" data-field={field.name} key={field.name}>
                  {heading}
                  <TagsInput
                    label={label}
                    describedBy={described}
                    value={value}
                    suggestions={tags}
                    onChange={(next) => set(field.name, next)}
                  />
                </div>
              );
            }
            if (field.name === 'icon') {
              return (
                <div class="field field-wide" data-field={field.name} key={field.name}>
                  {heading}
                  <IconPicker
                    label={label}
                    describedBy={described}
                    value={value}
                    color={String(values.iconColor ?? '')}
                    seed={String(values.name ?? '')}
                    onChange={(next) => set(field.name, next)}
                    fetcher={fetcher}
                  />
                </div>
              );
            }
            if (field.name === 'iconColor') {
              return (
                <div class="field field-wide" data-field={field.name} key={field.name}>
                  <label for={`edit-${field.name}`}>{heading}</label>
                  <ColorPicker
                    id={`edit-${field.name}`}
                    label={label}
                    describedBy={described}
                    value={value}
                    invalid={Boolean(wrong)}
                    onChange={(next) => set(field.name, next)}
                    onBlur={() => setTouched({ ...touched, [field.name]: true })}
                  />
                  {complaint}
                </div>
              );
            }
            // What is said about a field stands next to it, outside its
            // label: the label is the field's name, and stays that.
            return (
              <div class="field field-wide" data-field={field.name} key={field.name}>
                <label for={`edit-${field.name}`}>{heading}</label>
                <input
                  id={`edit-${field.name}`}
                  // One of text, url and number, which the element's types
                  // only accept one at a time. A number is typed as text, so
                  // that what is not one can be said to be wrong.
                  type={(field.type === 'number' ? 'text' : field.type) as 'text'}
                  inputMode={field.type === 'number' ? 'numeric' : undefined}
                  class={wrong ? 'd-input d-input-error' : 'd-input'}
                  value={value}
                  required={required}
                  aria-invalid={wrong ? true : undefined}
                  aria-describedby={described}
                  // The groups in use are offered, and any other can be typed.
                  list={field.name === 'group' ? 'editor-groups' : undefined}
                  onInput={(event) => set(field.name, event.currentTarget.value)}
                  onBlur={() => setTouched({ ...touched, [field.name]: true })}
                />
                {field.name === 'group' && (
                  <datalist id="editor-groups">
                    {groups.map((group) => (
                      <option key={group} value={group} />
                    ))}
                  </datalist>
                )}
                {complaint}
                {field.name === 'url' && !wrong && reach && (
                  // In words and with a mark, not only in colour.
                  <small class={`address-check address-${reach}`} role="status">
                    {reach !== 'checking' && <Icon name={reach === 'up' ? 'check' : 'warning'} size={14} />}{' '}
                    {t(`edit.check.${reach}`)}
                  </small>
                )}
                {field.name === 'url' && urlFrom && (
                  <small>{t('edit.urlFrom', { kind: urlFrom.kind ?? '', name: urlFrom.name ?? '' })}</small>
                )}
              </div>
            );
          })}
        {problem && (
          <p class="d-alert d-alert-error d-alert-soft form-error" role="alert">
            {problem}
          </p>
        )}
        <div class="form-actions">
          {existing &&
            (confirming ? (
              <>
                <span>{t('edit.delete.confirm')}</span>
                <button
                  type="button"
                  class="d-btn d-btn-error"
                  disabled={busy}
                  onClick={() => void run(() => deleteResource(target, fetcher))}
                >
                  {t('edit.delete.yes')}
                </button>
                <button type="button" class="d-btn d-btn-ghost" onClick={() => setConfirming(false)}>
                  {t('edit.delete.no')}
                </button>
              </>
            ) : (
              <button type="button" class="d-btn d-btn-error d-btn-outline" disabled={busy} onClick={() => setConfirming(true)}>
                {t('edit.delete')}
              </button>
            ))}
          <span class="form-spacer" />
          <button type="button" class="d-btn d-btn-ghost" onClick={onClose}>
            {t('edit.cancel')}
          </button>
          <button type="submit" class="d-btn d-btn-primary" disabled={busy || base === null}>
            {t('edit.save')}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// Says why a tile cannot be changed from this page, and where it can. It
// also has the link the tile would be outside edit mode.
export function Fixed({ what, onClose }: { what: FixedTile; onClose: () => void }) {
  const { tile, reason } = what;
  const title = t('edit.fixed.title', { name: tile.name });
  const href = safeHref(tile.url);
  return (
    <Modal label={title} class="settings editor" onClose={onClose}>
      <header class="settings-header">
        <h2>{title}</h2>
        <button type="button" class="d-btn d-btn-ghost d-btn-sm d-btn-circle" aria-label={t('settings.close')} onClick={onClose}>
          <Icon name="close" />
        </button>
      </header>
      <div class="settings-body">
        <p>{t(`edit.fixed.${reason}`, { cluster: tile.cluster })}</p>
        <p class="help">
          {t('edit.fixed.from', {
            type: tile.source.type,
            namespace: tile.source.namespace,
            name: tile.source.name,
          })}
        </p>
        {href && (
          <p class="changes-link">
            <a
              class="d-btn d-btn-outline d-btn-sm"
              href={href}
              target={tile.targetBlank ? '_blank' : undefined}
              rel={tile.targetBlank ? 'noopener noreferrer' : undefined}
            >
              {t('edit.fixed.open', { name: tile.name })}
            </a>
          </p>
        )}
      </div>
    </Modal>
  );
}

// What an instance with an edit key adds to the corner while the page is
// being edited: the button that adds a tile, and the lock. Adding asks for
// the key first when the page is locked.
export function EditControls({
  isUnlocked,
  onUnlock,
  onAdd,
}: {
  isUnlocked: boolean;
  onUnlock: () => void;
  onAdd: () => void;
}) {
  return (
    <>
      <button type="button" class="icon-button" aria-label={t('edit.add')} title={t('edit.add')} onClick={onAdd}>
        <Icon name="plus" />
      </button>
      <button
        type="button"
        class="icon-button"
        aria-label={t(isUnlocked ? 'unlock.lock' : 'unlock.open')}
        title={t(isUnlocked ? 'unlock.lock' : 'unlock.open')}
        aria-pressed={isUnlocked}
        onClick={isUnlocked ? lock : onUnlock}
      >
        <Icon name={isUnlocked ? 'unlocked' : 'locked'} />
      </button>
    </>
  );
}
