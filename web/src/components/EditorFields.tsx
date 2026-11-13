import { useEffect, useRef, useState } from 'preact/hooks';
import { searchIcons, splitTags } from '../editing';
import { t } from '../i18n';
import { iconSource } from '../url';
import { Icon } from './Icons';

// Tags as a row of pills with a field after them. Enter or a comma ends a
// tag, Backspace in the empty field takes the last one away, and each pill
// has a button that removes it. The value is the list separated by commas,
// which is how a resource holds it.
export function TagsInput({
  label,
  describedBy,
  value,
  suggestions,
  onChange,
}: {
  label: string;
  describedBy?: string;
  value: string;
  // Tags that are in use, offered while typing.
  suggestions: string[];
  onChange: (value: string) => void;
}) {
  const [draft, setDraft] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const tags = splitTags(value);
  const set = (next: string[]) => onChange(next.join(', '));
  // Takes what has been typed as a tag, or as several when it was pasted
  // with commas in it.
  const commit = (text: string) => {
    const added = splitTags(text).filter((tag) => !tags.includes(tag));
    if (added.length > 0) set([...tags, ...added]);
    setDraft('');
  };
  return (
    // A click next to the pills goes to the field, as in one wide field.
    <div class="d-input tags-input" onClick={(event) => event.target === event.currentTarget && input.current?.focus()}>
      {tags.map((tag) => (
        <span class="d-badge d-badge-soft d-badge-primary tag-pill" key={tag}>
          {tag}
          <button
            type="button"
            aria-label={t('edit.tags.remove', { tag })}
            onClick={() => {
              set(tags.filter((other) => other !== tag));
              input.current?.focus();
            }}
          >
            <Icon name="close" size={12} />
          </button>
        </span>
      ))}
      <input
        ref={input}
        type="text"
        aria-label={label}
        aria-describedby={describedBy}
        list="editor-tags"
        value={draft}
        onInput={(event) => {
          const text = event.currentTarget.value;
          if (text.includes(',')) commit(text);
          else setDraft(text);
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && draft.trim() !== '') {
            // The tag, not the form.
            event.preventDefault();
            commit(draft);
          } else if (event.key === 'Backspace' && draft === '' && tags.length > 0) {
            set(tags.slice(0, -1));
          }
        }}
        // What is still being typed counts when the field is left.
        onBlur={() => draft.trim() !== '' && commit(draft)}
      />
      <datalist id="editor-tags">
        {suggestions
          .filter((tag) => !tags.includes(tag))
          .map((tag) => (
            <option key={tag} value={tag} />
          ))}
      </datalist>
    </div>
  );
}

// The icon of a tile: its name or address in a field, shown next to it as
// it will look, and a search of the icon sets to pick one from.
export function IconPicker({
  label,
  describedBy,
  value,
  color,
  seed,
  onChange,
  fetcher,
}: {
  label: string;
  describedBy?: string;
  value: string;
  // The colour the icon is given, when the tile names one.
  color: string;
  // What to search for when the search is opened empty: the tile's name.
  seed: string;
  onChange: (value: string) => void;
  fetcher?: typeof fetch;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [found, setFound] = useState<string[] | null>(null);
  const [searching, setSearching] = useState(false);
  const search = useRef<HTMLInputElement>(null);
  // An icon that takes a colour is drawn in the tile's, or else in the
  // colour of the text around it.
  const ink = color.trim() || getComputedStyle(document.documentElement).getPropertyValue('--text').trim() || '#888888';
  const preview = iconSource(value, ink);
  // The search field is what the search was opened for.
  useEffect(() => {
    if (open) search.current?.focus();
  }, [open]);

  // Searches a moment after the last key, not at every one.
  useEffect(() => {
    const word = query.trim();
    if (!open || word === '') {
      setFound(null);
      setSearching(false);
      return;
    }
    let current = true;
    setSearching(true);
    const timer = setTimeout(() => {
      void searchIcons(word, fetcher).then((icons) => {
        if (!current) return;
        setFound(icons);
        setSearching(false);
      });
    }, 250);
    return () => {
      current = false;
      clearTimeout(timer);
    };
  }, [open, query]);

  const status = searching
    ? t('edit.icon.searching')
    : found === null
      ? t('edit.icon.hint')
      : found.length === 0
        ? t('edit.icon.none')
        : t('edit.icon.found', { count: found.length });
  return (
    <div class="icon-picker">
      <div class="icon-picker-row">
        <span class="icon-preview" aria-hidden="true">
          {preview && <img src={preview} alt="" width="24" height="24" referrerpolicy="no-referrer" />}
        </span>
        <input
          type="text"
          class="d-input"
          aria-label={label}
          aria-describedby={describedBy}
          value={value}
          onInput={(event) => onChange(event.currentTarget.value)}
        />
        <button
          type="button"
          class="d-btn"
          aria-expanded={open}
          aria-controls="icon-search"
          onClick={() => {
            if (!open && query === '') setQuery(seed.trim().split(/\s+/)[0]?.toLowerCase() ?? '');
            setOpen(!open);
          }}
        >
          <Icon name="search" size={16} />
          {t('edit.icon.choose')}
        </button>
      </div>
      {open && (
        <div class="icon-search" id="icon-search">
          <input
            type="search"
            class="d-input d-input-sm"
            aria-label={t('edit.icon.search')}
            placeholder={t('edit.icon.search')}
            value={query}
            ref={search}
            onInput={(event) => setQuery(event.currentTarget.value)}
            onKeyDown={(event) => event.key === 'Enter' && event.preventDefault()}
          />
          <p class="help" role="status">
            {status}
          </p>
          {found && found.length > 0 && (
            <ul class="icon-results">
              {found.map((name) => (
                <li key={name}>
                  <button
                    type="button"
                    class={name === value ? 'd-btn d-btn-square d-btn-active' : 'd-btn d-btn-ghost d-btn-square'}
                    aria-label={name}
                    aria-pressed={name === value}
                    title={name}
                    onClick={() => {
                      onChange(name);
                      setOpen(false);
                    }}
                  >
                    <img src={iconSource(name, ink) ?? ''} alt="" width="24" height="24" loading="lazy" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

// Colours to pick with one click. Any other is chosen in the browser's own
// picker, or typed.
const SWATCHES = [
  '#e53935',
  '#fb8c00',
  '#fdd835',
  '#43a047',
  '#00acc1',
  '#1e88e5',
  '#5e35b1',
  '#d81b60',
  '#6d4c41',
  '#757575',
  '#ffffff',
  '#000000',
];

// The colour as "#rrggbb", which is what the browser's picker takes. A name
// such as "red" is asked of the browser; what it does not know is black.
function toHex(color: string): string {
  const value = color.trim();
  if (/^#[0-9a-f]{6}$/i.test(value)) return value.toLowerCase();
  if (/^#[0-9a-f]{3}$/i.test(value)) return `#${[...value.slice(1)].map((c) => c + c).join('')}`.toLowerCase();
  try {
    const probe = document.createElement('span');
    probe.style.color = value;
    document.body.append(probe);
    const parts = getComputedStyle(probe).color.match(/\d+/g);
    probe.remove();
    if (parts && parts.length >= 3) {
      return `#${parts
        .slice(0, 3)
        .map((part) => Number(part).toString(16).padStart(2, '0'))
        .join('')}`;
    }
  } catch {
    // Without a document to ask, the picker starts at black.
  }
  return '#000000';
}

// The colour of an icon: a patch that opens the browser's colour picker, a
// row of ready colours, and the field itself, which also takes a name.
export function ColorPicker({
  id,
  label,
  describedBy,
  value,
  invalid,
  onChange,
  onBlur,
}: {
  id: string;
  label: string;
  describedBy?: string;
  value: string;
  invalid: boolean;
  onChange: (value: string) => void;
  onBlur: () => void;
}) {
  const chosen = value.trim().toLowerCase();
  return (
    <div class="color-picker">
      <div class="icon-picker-row">
        <input
          type="color"
          class="swatch"
          aria-label={t('edit.color.pick')}
          title={t('edit.color.pick')}
          value={toHex(value)}
          onInput={(event) => onChange(event.currentTarget.value)}
        />
        <input
          id={id}
          type="text"
          class={invalid ? 'd-input d-input-error' : 'd-input'}
          aria-label={label}
          aria-invalid={invalid ? true : undefined}
          aria-describedby={describedBy}
          placeholder="#1e88e5"
          value={value}
          onInput={(event) => onChange(event.currentTarget.value)}
          onBlur={onBlur}
        />
        <button type="button" class="d-btn d-btn-ghost" disabled={value === ''} onClick={() => onChange('')}>
          {t('edit.color.clear')}
        </button>
      </div>
      <ul class="color-swatches" aria-label={t('edit.color.ready')}>
        {SWATCHES.map((color) => (
          <li key={color}>
            <button
              type="button"
              class="color-swatch"
              style={{ '--swatch': color }}
              aria-label={color}
              aria-pressed={chosen === color}
              title={color}
              onClick={() => onChange(color)}
            >
              {/* The one in use has a mark, not only a ring. */}
              {chosen === color && <Icon name="check" size={14} />}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
