import { useEffect, useState } from 'preact/hooks';
import {
  deleteResource,
  EditError,
  FIELDS,
  loadResource,
  lock,
  saveResource,
  toForm,
  toSpec,
  unlock,
  type EditKind,
  type EditTarget,
  type FormValues,
  type Spec,
} from '../editing';
import { t, type MessageKey } from '../i18n';
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
  const submit = (event: Event) => {
    event.preventDefault();
    if (base === null || busy) return;
    void run(() => saveResource({ ...target, kind }, toSpec(kind, base, values), fetcher));
  };

  const title = t(`edit.${existing ? 'change' : 'add'}.${kind}` as MessageKey);
  // An address that is read from another object does not have to be given.
  const urlFrom = base?.urlFrom as { kind?: string; name?: string } | undefined;
  return (
    <Modal label={title} class="settings editor" onClose={onClose}>
      <header class="settings-header">
        <h2>{title}</h2>
        <button type="button" class="d-btn d-btn-ghost d-btn-sm d-btn-circle" aria-label={t('settings.close')} onClick={onClose}>
          <Icon name="close" />
        </button>
      </header>
      <form class="settings-body" onSubmit={submit}>
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
                    onChange={(event) => setValues({ ...values, [field.name]: event.currentTarget.checked })}
                  />
                </label>
              );
            }
            return (
              <label class="field field-wide" key={field.name}>
                <span>
                  {label}
                  {hint && <small>{hint}</small>}
                </span>
                <input
                  // One of text, url and number, which the element's types
                  // only accept one at a time.
                  type={field.type as 'text'}
                  class="d-input"
                  value={String(values[field.name] ?? '')}
                  required={field.required && !(field.name === 'url' && urlFrom)}
                  onInput={(event) => setValues({ ...values, [field.name]: event.currentTarget.value })}
                />
                {field.name === 'url' && urlFrom && (
                  <small>{t('edit.urlFrom', { kind: urlFrom.kind ?? '', name: urlFrom.name ?? '' })}</small>
                )}
              </label>
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
