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
        <button type="button" class="icon-button" aria-label={t('settings.close')} onClick={onClose}>
          <Icon name="close" />
        </button>
      </header>
      <form class="settings-body" onSubmit={submit}>
        <p class="help">{t('unlock.help')}</p>
        <label class="field field-wide">
          <span>{t('unlock.key')}</span>
          <input
            type="password"
            value={key}
            // A password manager may offer it, as it would a password.
            autocomplete="current-password"
            required
            onInput={(event) => setKey(event.currentTarget.value)}
          />
        </label>
        {problem && (
          <p class="form-error" role="alert">
            {problem}
          </p>
        )}
        <div class="form-actions">
          <button type="submit" class="button-primary" disabled={busy || key === ''}>
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
  const [base, setBase] = useState<Spec | null>(existing ? null : {});
  const [values, setValues] = useState<FormValues>(() => toForm(target.kind, {}));
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
    void run(() => saveResource(target, toSpec(target.kind, base, values), fetcher));
  };

  const title = t(`edit.${existing ? 'change' : 'add'}.${target.kind}` as MessageKey);
  // An address that is read from another object does not have to be given.
  const urlFrom = base?.urlFrom as { kind?: string; name?: string } | undefined;
  return (
    <Modal label={title} class="settings editor" onClose={onClose}>
      <header class="settings-header">
        <h2>{title}</h2>
        <button type="button" class="icon-button" aria-label={t('settings.close')} onClick={onClose}>
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
        {base !== null &&
          FIELDS[target.kind].map((field) => {
            const label = t(`edit.field.${field.name}` as MessageKey);
            // A bookmark has to name its group, so the hint about the
            // default is for applications only.
            const explained = HINTS.includes(field.name) && !(field.name === 'group' && field.required);
            const hint = explained ? t(`edit.help.${field.name}` as MessageKey) : null;
            if (field.type === 'check') {
              return (
                <label class="field field-check" key={field.name}>
                  <input
                    type="checkbox"
                    checked={values[field.name] === true}
                    onChange={(event) => setValues({ ...values, [field.name]: event.currentTarget.checked })}
                  />
                  <span>
                    {label}
                    {hint && <small>{hint}</small>}
                  </span>
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
          <p class="form-error" role="alert">
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
                  class="button-danger"
                  disabled={busy}
                  onClick={() => void run(() => deleteResource(target, fetcher))}
                >
                  {t('edit.delete.yes')}
                </button>
                <button type="button" onClick={() => setConfirming(false)}>
                  {t('edit.delete.no')}
                </button>
              </>
            ) : (
              <button type="button" class="button-danger" disabled={busy} onClick={() => setConfirming(true)}>
                {t('edit.delete')}
              </button>
            ))}
          <span class="form-spacer" />
          <button type="button" onClick={onClose}>
            {t('edit.cancel')}
          </button>
          <button type="submit" class="button-primary" disabled={busy || base === null}>
            {t('edit.save')}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// The lock in the corner of the page, and next to it the button that adds a
// tile while the page is unlocked.
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
      {isUnlocked && (
        <button type="button" class="icon-button" aria-label={t('edit.add')} title={t('edit.add')} onClick={onAdd}>
          <Icon name="plus" />
        </button>
      )}
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
