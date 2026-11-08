import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { t } from '../i18n';
import { searchTiles, webQuery } from '../search';
import type { Tile } from '../types';
import { safeHref } from '../url';
import { Icon } from './Icons';
import { Modal } from './Modal';

interface Result {
  key: string;
  label: string;
  detail: string;
  badge: string;
  href: string;
  newTab: boolean;
}

export type Navigate = (href: string, newTab: boolean) => void;

const go: Navigate = (href, newTab) => {
  if (newTab) {
    window.open(href, '_blank', 'noopener,noreferrer');
  } else {
    window.location.assign(href);
  }
};

// The search box that opens over the page. It finds tiles as you type and
// is driven entirely from the keyboard; a query that starts with "?" is
// sent to the configured search engine.
export function Spotlight({
  tiles,
  searchEngine,
  showCluster,
  onClose,
  navigate = go,
}: {
  tiles: Tile[];
  searchEngine: string;
  showCluster: boolean;
  onClose: () => void;
  navigate?: Navigate;
}) {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => input.current?.focus(), []);

  const results = useMemo<Result[]>(() => {
    const web = webQuery(query);
    if (web !== null) {
      return web === ''
        ? []
        : [
            {
              key: 'web',
              label: t('search.web', { query: web }),
              detail: '',
              badge: '',
              href: searchEngine + encodeURIComponent(web),
              newTab: true,
            },
          ];
    }
    return searchTiles(tiles, query).flatMap((tile) => {
      const href = safeHref(tile.url);
      if (!href) return [];
      return [
        {
          key: tile.id,
          label: tile.name,
          detail: [showCluster ? tile.cluster : '', tile.group, tile.info ?? ''].filter(Boolean).join(' · '),
          badge: t(tile.kind === 'bookmark' ? 'search.bookmark' : 'search.application'),
          href,
          newTab: tile.targetBlank,
        },
      ];
    });
  }, [query, tiles, searchEngine, showCluster]);

  const current = Math.min(active, Math.max(results.length - 1, 0));
  const open = (result: Result | undefined) => {
    if (!result) return;
    onClose();
    navigate(result.href, result.newTab);
  };
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive(results.length ? (current + 1) % results.length : 0);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive(results.length ? (current - 1 + results.length) % results.length : 0);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      open(results[current]);
    }
  };
  const searched = query.trim() !== '' && webQuery(query) !== '';

  return (
    <Modal label={t('search.title')} class="spotlight" onClose={onClose}>
      <div class="spotlight-input">
        <Icon name="search" />
        <input
          ref={input}
          // Not type="search": there Escape first clears the field, and
          // only a second press would close the dialog.
          type="text"
          enterkeyhint="go"
          // The typings only allow this role together with a datalist, but
          // a text input that controls a listbox is exactly a combobox.
          {...({ role: 'combobox' } as object)}
          aria-label={t('search.title')}
          aria-expanded={results.length > 0}
          aria-controls="spotlight-results"
          aria-activedescendant={results[current] ? `spotlight-option-${current}` : undefined}
          aria-autocomplete="list"
          autocomplete="off"
          spellcheck={false}
          placeholder={t('search.placeholder')}
          value={query}
          onInput={(event) => {
            setQuery(event.currentTarget.value);
            setActive(0);
          }}
          onKeyDown={onKeyDown}
        />
      </div>
      <ul id="spotlight-results" role="listbox" aria-label={t('search.title')} class="spotlight-results">
        {results.map((result, index) => (
          <li
            key={result.key}
            id={`spotlight-option-${index}`}
            role="option"
            aria-selected={index === current}
            class={index === current ? 'spotlight-option spotlight-active' : 'spotlight-option'}
            onMouseEnter={() => setActive(index)}
            onClick={() => open(result)}
          >
            <span class="spotlight-label">{result.label}</span>
            {result.detail && <span class="spotlight-detail">{result.detail}</span>}
            {result.badge && <span class="spotlight-badge">{result.badge}</span>}
          </li>
        ))}
      </ul>
      {/* Announces the outcome to screen readers as the query changes. */}
      <p class="spotlight-status" role="status">
        {searched ? (results.length ? t('search.results', { count: results.length }) : t('search.noResults')) : t('search.hint')}
      </p>
    </Modal>
  );
}
