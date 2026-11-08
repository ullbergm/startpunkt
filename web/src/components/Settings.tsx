import type { ComponentChildren } from 'preact';
import { languages, t, type MessageKey } from '../i18n';
import {
  DIRECTIONS,
  FONT_SCALES,
  MAX_COLUMNS,
  prefs,
  resetPrefs,
  updatePrefs,
  type BackgroundType,
  type Preferences,
  type Spacing,
  type ThemeMode,
} from '../prefs';
import { Icon } from './Icons';
import { Modal } from './Modal';

const setLayout = (change: Partial<Preferences['layout']>) =>
  updatePrefs((p) => ({ ...p, layout: { ...p.layout, ...change } }));
const setBackground = (change: Partial<Preferences['background']>) =>
  updatePrefs((p) => ({ ...p, background: { ...p.background, ...change } }));
const setAccessibility = (change: Partial<Preferences['accessibility']>) =>
  updatePrefs((p) => ({ ...p, accessibility: { ...p.accessibility, ...change } }));

function Check({
  label,
  help,
  checked,
  onChange,
}: {
  label: string;
  help?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label class="field field-check">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.currentTarget.checked)} />
      <span>
        {label}
        {help && <small>{help}</small>}
      </span>
    </label>
  );
}

function Select<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <label class="field">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.currentTarget.value as T)}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function Group({ title, children }: { title: string; children: ComponentChildren }) {
  return (
    <fieldset>
      <legend>{title}</legend>
      {children}
    </fieldset>
  );
}

// The names of languages are shown in the language itself, so that someone
// who cannot read the current language can still find their own.
const languageName = (tag: string) => {
  try {
    const name = new Intl.DisplayNames([tag], { type: 'language' }).of(tag);
    return name ? name.charAt(0).toUpperCase() + name.slice(1) : tag;
  } catch {
    return tag;
  }
};

export function Settings({ onClose }: { onClose: () => void }) {
  const p = prefs.value;
  const scale = FONT_SCALES.indexOf(p.accessibility.fontScale);
  const themes: ThemeMode[] = ['auto', 'light', 'dark'];
  const spacings: Spacing[] = ['tight', 'normal', 'relaxed'];
  const backgrounds: BackgroundType[] = ['theme', 'solid', 'gradient', 'image', 'pictureOfDay'];
  const type = p.background.type;

  return (
    <Modal label={t('settings.title')} class="settings" onClose={onClose}>
      <header class="settings-header">
        <h2>{t('settings.title')}</h2>
        <button type="button" class="icon-button" aria-label={t('settings.close')} onClick={onClose}>
          <Icon name="close" />
        </button>
      </header>
      <form class="settings-body" onSubmit={(event) => event.preventDefault()}>
        <Group title={t('settings.appearance')}>
          <Select
            label={t('settings.theme')}
            value={p.theme}
            options={themes.map((value) => ({ value, label: t(`settings.theme.${value}` as MessageKey) }))}
            onChange={(theme) => updatePrefs((current) => ({ ...current, theme }))}
          />
          <Select
            label={t('settings.language')}
            value={p.language ?? ''}
            options={[
              { value: '', label: t('settings.language.auto') },
              ...languages.map((tag) => ({ value: tag, label: languageName(tag) })),
            ]}
            onChange={(language) => updatePrefs((current) => ({ ...current, language: language || null }))}
          />
        </Group>

        <Group title={t('settings.layout')}>
          <Select
            label={t('settings.columns')}
            value={String(p.layout.columns)}
            options={Array.from({ length: MAX_COLUMNS + 1 }, (_, n) => ({
              value: String(n),
              label: n === 0 ? t('settings.columns.auto') : String(n),
            }))}
            onChange={(columns) => setLayout({ columns: Number(columns) })}
          />
          <Select
            label={t('settings.spacing')}
            value={p.layout.spacing}
            options={spacings.map((value) => ({ value, label: t(`settings.spacing.${value}` as MessageKey) }))}
            onChange={(spacing) => setLayout({ spacing })}
          />
          <Check label={t('settings.compact')} checked={p.layout.compact} onChange={(compact) => setLayout({ compact })} />
          <Check
            label={t('settings.showDescription')}
            checked={p.layout.showDescription}
            onChange={(showDescription) => setLayout({ showDescription })}
          />
          <Check
            label={t('settings.showStatus')}
            checked={p.layout.showStatus}
            onChange={(showStatus) => setLayout({ showStatus })}
          />
          <Check
            label={t('settings.hideUnreachable')}
            checked={p.layout.hideUnreachable}
            onChange={(hideUnreachable) => setLayout({ hideUnreachable })}
          />
        </Group>

        <Group title={t('settings.background')}>
          <Select
            label={t('settings.background.type')}
            value={type}
            options={backgrounds.map((value) => ({ value, label: t(`settings.background.${value}` as MessageKey) }))}
            onChange={(next) => setBackground({ type: next })}
          />
          {(type === 'solid' || type === 'gradient') && (
            <label class="field">
              <span>{t('settings.background.color')}</span>
              <input
                type="color"
                value={p.background.color}
                onInput={(event) => setBackground({ color: event.currentTarget.value })}
              />
            </label>
          )}
          {type === 'gradient' && (
            <>
              <label class="field">
                <span>{t('settings.background.color2')}</span>
                <input
                  type="color"
                  value={p.background.color2}
                  onInput={(event) => setBackground({ color2: event.currentTarget.value })}
                />
              </label>
              <Select
                label={t('settings.background.direction')}
                value={p.background.direction}
                options={DIRECTIONS.map((value) => ({
                  value,
                  label: t(`settings.background.direction.${value}` as MessageKey),
                }))}
                onChange={(direction) => setBackground({ direction })}
              />
            </>
          )}
          {type === 'image' && (
            <label class="field field-wide">
              <span>
                {t('settings.background.imageUrl')}
                <small>{t('settings.background.imageUrlHelp')}</small>
              </span>
              <input
                type="url"
                inputMode="url"
                placeholder="https://example.com/image.jpg"
                value={p.background.imageUrl}
                onChange={(event) => setBackground({ imageUrl: event.currentTarget.value })}
              />
            </label>
          )}
          {(type === 'image' || type === 'pictureOfDay') && (
            <Check label={t('settings.background.blur')} checked={p.background.blur} onChange={(blur) => setBackground({ blur })} />
          )}
          {type !== 'theme' && (
            <Check
              label={t('settings.background.overlay')}
              help={t('settings.background.overlayHelp')}
              checked={p.background.overlay}
              onChange={(overlay) => setBackground({ overlay })}
            />
          )}
        </Group>

        <Group title={t('settings.accessibility')}>
          <div class="field">
            <span id="font-size-label">{t('settings.fontSize')}</span>
            <span class="stepper" role="group" aria-labelledby="font-size-label">
              <button
                type="button"
                aria-label={t('settings.fontSize.decrease')}
                disabled={scale <= 0}
                onClick={() => setAccessibility({ fontScale: FONT_SCALES[scale - 1] })}
              >
                −
              </button>
              <output aria-live="polite">{p.accessibility.fontScale}%</output>
              <button
                type="button"
                aria-label={t('settings.fontSize.increase')}
                disabled={scale >= FONT_SCALES.length - 1}
                onClick={() => setAccessibility({ fontScale: FONT_SCALES[scale + 1] })}
              >
                +
              </button>
            </span>
          </div>
          <Check
            label={t('settings.highContrast')}
            help={t('settings.highContrastHelp')}
            checked={p.accessibility.highContrast}
            onChange={(highContrast) => setAccessibility({ highContrast })}
          />
          <dl class="shortcuts" aria-label={t('settings.shortcuts')}>
            <dt>
              <kbd>/</kbd> <kbd>Ctrl</kbd>+<kbd>K</kbd>
            </dt>
            <dd>{t('settings.shortcuts.search')}</dd>
            <dt>
              <kbd>Esc</kbd>
            </dt>
            <dd>{t('settings.shortcuts.close')}</dd>
          </dl>
        </Group>

        <button type="button" class="settings-reset" onClick={resetPrefs}>
          {t('settings.reset')}
        </button>
      </form>
    </Modal>
  );
}
