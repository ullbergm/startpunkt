import type { ComponentChildren } from 'preact';
import { useState } from 'preact/hooks';
import { languages, t, type MessageKey } from '../i18n';
import {
  activePreset,
  deletePreset,
  DIRECTIONS,
  FONT_SCALES,
  loadPreset,
  MAX_BLUR,
  MAX_COLUMNS,
  MAX_PANEL_BLUR,
  prefs,
  resetPrefs,
  savePreset,
  setClusterShown,
  setPanel,
  setTheme,
  TYPES,
  updatePrefs,
  type Background,
  type Complexity,
  type Preferences,
  type ThemeMode,
} from '../prefs';
import { SCHEMES, type ColorScheme } from '../palettes';
import type { Cluster } from '../types';
import { Icon } from './Icons';
import { Modal } from './Modal';
import { Tabs } from './Tabs';

const setLayout = (change: Partial<Preferences['layout']>) =>
  updatePrefs((p) => ({ ...p, layout: { ...p.layout, ...change } }));
const setBackground = (change: Partial<Background>) =>
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
    <label class="field">
      <span>
        {label}
        {help && <small>{help}</small>}
      </span>
      <input
        type="checkbox"
        class="d-toggle d-toggle-primary"
        checked={checked}
        onChange={(event) => onChange(event.currentTarget.checked)}
      />
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
      <select class="d-select d-select-sm" value={value} onChange={(event) => onChange(event.currentTarget.value as T)}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function Color({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label class="field">
      <span>{label}</span>
      <input type="color" class="swatch" value={value} onInput={(event) => onChange(event.currentTarget.value)} />
    </label>
  );
}

// A slider. The value is also shown as text, so it does not have to be read
// off the position of the thumb.
function Range({
  label,
  help,
  value,
  min,
  max,
  step,
  format,
  centred = false,
  onChange,
}: {
  label: string;
  help?: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (value: number) => string;
  // The middle is where nothing is chosen, and the bar grows from there to
  // either side.
  centred?: boolean;
  onChange: (value: number) => void;
}) {
  // Where along the track something is, as the middle of the thumb there.
  const at = (part: number) => `calc(0.5rem + (100% - 1rem) * ${part})`;
  const part = (value - min) / (max - min);
  return (
    <label class="field">
      <span>
        {label}
        {help && <small>{help}</small>}
      </span>
      <input
        type="range"
        class={centred ? 'range-centred' : 'd-range d-range-primary d-range-xs'}
        style={centred ? { '--from': at(Math.min(part, 0.5)), '--to': at(Math.max(part, 0.5)) } : undefined}
        min={min}
        max={max}
        step={step}
        value={value}
        // Named by the label alone. Without this the name would also take
        // in the help text and the value shown next to the slider.
        aria-label={label}
        aria-description={help}
        aria-valuetext={format(value)}
        onInput={(event) => onChange(Number(event.currentTarget.value))}
      />
      <output>{format(value)}</output>
    </label>
  );
}

const percent = (value: number) => `${Math.round(value * 100)}%`;

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

function Appearance({ p }: { p: Preferences }) {
  const themes: ThemeMode[] = ['auto', 'light', 'dark'];
  return (
    <>
      <Select
        label={t('settings.theme')}
        value={p.theme}
        options={themes.map((value) => ({ value, label: t(`settings.theme.${value}` as MessageKey) }))}
        onChange={setTheme}
      />
      <Select<ColorScheme>
        label={t('settings.colors')}
        value={p.colors}
        options={(['default', ...SCHEMES] as const).map((value) => ({
          value,
          label: t(`settings.colors.${value}` as MessageKey),
        }))}
        onChange={(colors) => updatePrefs((current) => ({ ...current, colors }))}
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
      <Check
        label={t('settings.handwrittenFont')}
        help={t('settings.handwrittenFontHelp')}
        checked={p.handwrittenFont}
        onChange={(handwrittenFont) => updatePrefs((current) => ({ ...current, handwrittenFont }))}
      />
    </>
  );
}

function Presets({ p }: { p: Preferences }) {
  const [name, setName] = useState('');
  const names = Object.keys(p.presets).sort((a, b) => a.localeCompare(b));
  const active = activePreset(p);
  const save = () => {
    savePreset(name);
    setName('');
  };
  return (
    <>
      <p class="help">{t('settings.presets.help')}</p>
      {names.length === 0 ? (
        <p class="help">{t('settings.presets.none')}</p>
      ) : (
        <ul class="presets">
          {names.map((preset) => (
            <li key={preset}>
              <button
                type="button"
                class={preset === active ? 'd-btn d-btn-sm d-btn-active' : 'd-btn d-btn-sm'}
                aria-pressed={preset === active}
                aria-label={t('settings.presets.load', { name: preset })}
                onClick={() => loadPreset(preset)}
              >
                {/* The preset in use carries a mark, not only a shade. */}
                {preset === active && <Icon name="check" size={16} />}
                {preset}
              </button>
              <button
                type="button"
                class="d-btn d-btn-ghost d-btn-sm d-btn-square"
                aria-label={t('settings.presets.delete', { name: preset })}
                onClick={() => deletePreset(preset)}
              >
                <Icon name="close" size={16} />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div class="preset-save field">
        <input
          type="text"
          class="d-input d-input-sm"
          maxLength={40}
          aria-label={t('settings.presets.name')}
          placeholder={t('settings.presets.name')}
          value={name}
          onInput={(event) => setName(event.currentTarget.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && name.trim() !== '') save();
          }}
        />
        <button type="button" class="d-btn d-btn-primary d-btn-sm" disabled={name.trim() === ''} onClick={save}>
          {t('settings.presets.save')}
        </button>
      </div>
    </>
  );
}

function Layout({ p }: { p: Preferences }) {
  return (
    <>
      <Select
        label={t('settings.columns')}
        value={String(p.layout.columns)}
        options={Array.from({ length: MAX_COLUMNS + 1 }, (_, n) => ({
          value: String(n),
          label: n === 0 ? t('settings.columns.auto') : String(n),
        }))}
        onChange={(columns) => setLayout({ columns: Number(columns) })}
      />
      <Check
        label={t('settings.showBoxes')}
        checked={p.layout.showBoxes}
        onChange={(showBoxes) => setLayout({ showBoxes })}
      />
      <Check
        label={t('settings.hoverEffect')}
        checked={p.layout.hoverEffect}
        onChange={(hoverEffect) => setLayout({ hoverEffect })}
      />
      <Check
        label={t('settings.showDescription')}
        checked={p.layout.showDescription}
        onChange={(showDescription) => setLayout({ showDescription })}
      />
      {p.layout.showDescription && (
        <Select
          label={t('settings.descriptionLines')}
          value={String(p.layout.descriptionLines)}
          options={[1, 2, 3, 0].map((n) => ({
            value: String(n),
            label: n === 0 ? t('settings.descriptionLines.any') : String(n),
          }))}
          onChange={(value) => setLayout({ descriptionLines: Number(value) })}
        />
      )}
      <Check label={t('settings.showTags')} checked={p.layout.showTags} onChange={(showTags) => setLayout({ showTags })} />
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
    </>
  );
}

function BackgroundTab({ p }: { p: Preferences }) {
  const b = p.background;
  const type = b.type;
  const complexities: Complexity[] = ['low', 'medium', 'high'];
  const isPicture = type === 'image' || type === 'pictureOfDay';
  return (
    <>
      <Select
        label={t('settings.background.type')}
        value={type}
        options={TYPES.map((value) => ({ value, label: t(`settings.background.${value}` as MessageKey) }))}
        onChange={(next) => setBackground({ type: next })}
      />
      {(type === 'solid' || type === 'gradient') && (
        <Color label={t('settings.background.color')} value={b.color} onChange={(color) => setBackground({ color })} />
      )}
      {type === 'gradient' && (
        <>
          <Color
            label={t('settings.background.color2')}
            value={b.color2}
            onChange={(color2) => setBackground({ color2 })}
          />
          <Select
            label={t('settings.background.direction')}
            value={b.direction}
            options={DIRECTIONS.map((value) => ({
              value,
              label: t(`settings.background.direction.${value}` as MessageKey),
            }))}
            onChange={(direction) => setBackground({ direction })}
          />
        </>
      )}
      {type === 'timeGradient' && <p class="help">{t('settings.background.timeGradientHelp')}</p>}
      {type === 'meshGradient' && (
        <>
          <div class="field">
            <span id="mesh-colors-label">{t('settings.background.meshColors')}</span>
            <span class="swatches" role="group" aria-labelledby="mesh-colors-label">
              {b.meshColors.map((color, index) => (
                <input
                  key={index}
                  type="color"
                  class="swatch"
                  aria-label={t('settings.background.meshColor', { number: index + 1 })}
                  value={color}
                  onInput={(event) =>
                    setBackground({
                      meshColors: b.meshColors.map((old, i) => (i === index ? event.currentTarget.value : old)),
                    })
                  }
                />
              ))}
            </span>
          </div>
          <Select
            label={t('settings.background.meshComplexity')}
            value={b.meshComplexity}
            options={complexities.map((value) => ({
              value,
              label: t(`settings.background.meshComplexity.${value}` as MessageKey),
            }))}
            onChange={(meshComplexity) => setBackground({ meshComplexity })}
          />
          <Check
            label={t('settings.background.meshAnimated')}
            help={t('settings.background.meshAnimatedHelp')}
            checked={b.meshAnimated}
            onChange={(meshAnimated) => setBackground({ meshAnimated })}
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
            class="d-input"
            inputMode="url"
            placeholder="https://example.com/image.jpg"
            value={b.imageUrl}
            onChange={(event) => setBackground({ imageUrl: event.currentTarget.value })}
          />
        </label>
      )}
      {type === 'geopattern' && (
        <>
          <label class="field field-wide">
            <span>
              {t('settings.background.patternSeed')}
              <small>{t('settings.background.patternSeedHelp')}</small>
            </span>
            <input
              type="text"
              class="d-input"
              maxLength={100}
              value={b.patternSeed}
              onInput={(event) => setBackground({ patternSeed: event.currentTarget.value })}
            />
          </label>
          <Color
            label={t('settings.background.patternColor')}
            value={b.color}
            onChange={(color) => setBackground({ color })}
          />
        </>
      )}
      {isPicture && (
        <Range
          label={t('settings.background.blur')}
          value={b.blur}
          min={0}
          max={MAX_BLUR}
          step={1}
          format={(value) => `${value}px`}
          onChange={(blur) => setBackground({ blur })}
        />
      )}
      {type !== 'theme' && (
        <>
          <Range
            label={t('settings.background.opacity')}
            value={b.opacity}
            min={0.1}
            max={1}
            step={0.05}
            format={percent}
            onChange={(opacity) => setBackground({ opacity })}
          />
          <Range
            label={t('settings.background.overlayOpacity')}
            help={t('settings.background.overlayHelp')}
            value={b.overlayOpacity}
            min={-1}
            max={1}
            step={0.05}
            centred
            format={(value) =>
              value === 0
                ? t('settings.background.overlay.off')
                : t(value < 0 ? 'settings.background.overlay.white' : 'settings.background.overlay.black', {
                    percent: percent(Math.abs(value)),
                  })
            }
            onChange={setPanel}
          />
          {b.overlayOpacity !== 0 && (
            <Range
              label={t('settings.background.overlayBlur')}
              value={b.overlayBlur}
              min={0}
              max={MAX_PANEL_BLUR}
              step={1}
              format={(value) => (value === 0 ? t('settings.background.overlay.off') : `${value}px`)}
              onChange={(overlayBlur) => setBackground({ overlayBlur })}
            />
          )}
        </>
      )}
    </>
  );
}

function Accessibility({ p }: { p: Preferences }) {
  const scale = FONT_SCALES.indexOf(p.accessibility.fontScale);
  return (
    <>
      <div class="field">
        <span id="font-size-label">{t('settings.fontSize')}</span>
        <span class="stepper" role="group" aria-labelledby="font-size-label">
          <button
            type="button"
            class="d-btn d-btn-sm d-btn-square"
            aria-label={t('settings.fontSize.decrease')}
            disabled={scale <= 0}
            onClick={() => setAccessibility({ fontScale: FONT_SCALES[scale - 1] })}
          >
            −
          </button>
          <output aria-live="polite">{p.accessibility.fontScale}%</output>
          <button
            type="button"
            class="d-btn d-btn-sm d-btn-square"
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
          <kbd class="d-kbd d-kbd-sm">/</kbd> <kbd class="d-kbd d-kbd-sm">Ctrl</kbd>+<kbd class="d-kbd d-kbd-sm">K</kbd>
        </dt>
        <dd>{t('settings.shortcuts.search')}</dd>
        <dt>
          <kbd class="d-kbd d-kbd-sm">Esc</kbd>
        </dt>
        <dd>{t('settings.shortcuts.close')}</dd>
      </dl>
    </>
  );
}

type Tab = 'appearance' | 'layout' | 'background' | 'presets' | 'clusters' | 'accessibility';

// Which clusters' tiles are shown. Offered when there is more than one.
function Clusters({ p, clusters, shown }: { p: Preferences; clusters: Cluster[]; shown: string[] }) {
  return (
    <>
      <Check
        label={t('settings.combine')}
        help={t('settings.combineHelp')}
        checked={p.layout.combine}
        onChange={(combine) => setLayout({ combine })}
      />
      <Check
        label={t('settings.byCluster')}
        help={t('settings.byClusterHelp')}
        checked={p.layout.byCluster}
        onChange={(byCluster) => setLayout({ byCluster })}
      />
      <p class="help">{t('settings.clusters.help')}</p>
      {clusters.map((cluster) => (
        <Check
          key={cluster.name}
          label={cluster.name}
          help={t(`settings.clusters.${cluster.local ? 'local' : cluster.state === 'connected' ? 'connected' : 'unreachable'}` as MessageKey)}
          checked={shown.includes(cluster.name)}
          onChange={(shown) => setClusterShown(cluster.name, shown)}
        />
      ))}
    </>
  );
}

// The settings, one section per tab.
export function Settings({
  onClose,
  clusters = [],
  shownClusters = clusters.map((cluster) => cluster.name),
}: {
  onClose: () => void;
  clusters?: Cluster[];
  // The names of the clusters whose tiles are shown right now.
  shownClusters?: string[];
}) {
  const p = prefs.value;
  const [tab, setTab] = useState<Tab>('appearance');
  // The clusters tab is there only when there is a choice to make.
  const TABS: Tab[] = ['appearance', 'layout', 'background', 'presets', ...(clusters.length > 1 ? (['clusters'] as const) : []), 'accessibility'];
  const panels: Record<Tab, ComponentChildren> = {
    appearance: <Appearance p={p} />,
    layout: <Layout p={p} />,
    background: <BackgroundTab p={p} />,
    presets: <Presets p={p} />,
    clusters: <Clusters p={p} clusters={clusters} shown={shownClusters} />,
    accessibility: <Accessibility p={p} />,
  };

  return (
    <Modal label={t('settings.title')} class="settings" onClose={onClose}>
      <header class="settings-header">
        <h2>{t('settings.title')}</h2>
        <button type="button" class="d-btn d-btn-ghost d-btn-sm d-btn-circle" aria-label={t('settings.close')} onClick={onClose}>
          <Icon name="close" />
        </button>
      </header>
      <Tabs
        id="settings"
        label={t('settings.tabs')}
        tabs={TABS.map((key) => ({ key, label: t(`settings.${key}` as MessageKey) }))}
        selected={tab}
        onSelect={setTab}
        kit
      />
      <div role="tabpanel" id="settings-panel" aria-labelledby={`settings-tab-${tab}`}>
        <form class="settings-body" onSubmit={(event) => event.preventDefault()}>
          {panels[tab]}
          <button type="button" class="d-btn d-btn-outline d-btn-sm settings-reset" onClick={resetPrefs}>
            {t('settings.reset')}
          </button>
        </form>
      </div>
    </Modal>
  );
}
