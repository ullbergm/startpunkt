import { Fragment } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { groupTiles } from '../group';
import { chooseLanguage, setLanguage, t } from '../i18n';
import { prefs } from '../prefs';
import { connect, connection, fatalError, serverState, type EventStream } from '../state';
import { filterByTags, tagsFromPath } from '../tags';
import { applyAppearance, resolveMode, systemPrefersDark } from '../theme';
import { Background } from './Background';
import { Icon } from './Icons';
import { Favorites, Section } from './Section';
import { Settings } from './Settings';
import { Skeleton } from './Skeleton';
import { Spotlight } from './Spotlight';
import { Tabs } from './Tabs';

type Kind = 'applications' | 'bookmarks';

// True while the keyboard is being used to type somewhere.
const typing = (target: EventTarget | null) =>
  target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));

export function App({ open }: { open?: (url: string) => EventStream }) {
  useEffect(() => connect(open), [open]);

  const state = serverState.value;
  const error = fatalError.value;
  const status = connection.value;
  const p = prefs.value;
  const [dialog, setDialog] = useState<'search' | 'settings' | null>(null);
  const [chosen, setChosen] = useState<Kind | null>(null);
  const [initialQuery, setInitialQuery] = useState('');
  const dialogOpen = useRef(false);
  dialogOpen.current = dialog !== null;

  const title = state?.config.title || 'Startpunkt';
  useEffect(() => {
    document.title = title;
  }, [title]);

  // Follow the system's light or dark setting while the theme is "auto".
  const [systemDark, setSystemDark] = useState(systemPrefersDark);
  useEffect(() => {
    const query = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!query) return;
    const listener = (event: MediaQueryListEvent) => setSystemDark(event.matches);
    query.addEventListener('change', listener);
    return () => query.removeEventListener('change', listener);
  }, []);
  const mode = resolveMode(p.theme, systemDark);
  const palette = state?.config.theme[mode];
  useEffect(() => applyAppearance(document.documentElement, mode, palette, p), [mode, palette, p]);

  const defaultLanguage = state?.config.defaultLanguage;
  useEffect(() => {
    // Wait for the server's default before settling on a language.
    if (p.language === null && defaultLanguage === undefined) return;
    void setLanguage(chooseLanguage(p.language, navigator.languages ?? [], defaultLanguage ?? ''));
  }, [p.language, defaultLanguage]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (dialogOpen.current) return;
      const modified = event.ctrlKey || event.metaKey || event.altKey;
      if (event.key.toLowerCase() === 'k' && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        setInitialQuery('');
        setDialog('search');
        return;
      }
      // Typing anywhere on the page starts a search with what was typed.
      // "/" opens the search empty. Space is left alone: it scrolls.
      if (modified || typing(event.target) || event.key.length !== 1 || event.key === ' ') return;
      event.preventDefault();
      setInitialQuery(event.key === '/' ? '' : event.key);
      setDialog('search');
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  // The tag filter is part of the URL, so a filtered page can be bookmarked.
  const tagged = state ? filterByTags(state.tiles, tagsFromPath(window.location.pathname)) : [];
  const tiles = p.layout.hideUnreachable ? tagged.filter((tile) => tile.available !== false) : tagged;
  // Favorites are shown once, in their own section and in the visitor's
  // order, and are left out of the groups below.
  const byId = new Map(tiles.map((tile) => [tile.id, tile]));
  const allFavorites = p.favorites.flatMap((id) => byId.get(id) ?? []);
  const others = tiles.filter((tile) => !p.favorites.includes(tile.id));
  const applications = groupTiles(others, 'application');
  const bookmarks = groupTiles(others, 'bookmark');
  // The tab the visitor picked, for as long as it has something to show.
  const kinds: Kind[] = [
    ...(tiles.some((tile) => tile.kind === 'application') ? (['applications'] as const) : []),
    ...(tiles.some((tile) => tile.kind === 'bookmark') ? (['bookmarks'] as const) : []),
  ];
  const view: Kind = chosen && kinds.includes(chosen) ? chosen : (kinds[0] ?? 'applications');
  // Each tab has its own favorites row.
  const favorites = allFavorites.filter((tile) => tile.kind === (view === 'applications' ? 'application' : 'bookmark'));
  const groups = view === 'applications' ? applications : bookmarks;
  const syncing = state?.clusters.some((cluster) => cluster.state === 'syncing') ?? false;
  const stale = state?.clusters.filter((cluster) => cluster.state === 'stale') ?? [];
  const empty = state !== null && tiles.length === 0;
  // Icons without a colour of their own take the theme's secondary colour,
  // so that they stand apart from the names next to them.
  const iconColor = palette?.bodyColor ?? '#696969';

  return (
    <>
      <a class="skip-link" href="#content">
        {t('page.skipToContent')}
      </a>
      <Background background={p.background} />
      <header class="page-header">
        {/* Decorative: the heading next to it names the page. */}
        <img class="logo" src="/logo.svg" alt="" width="40" height="40" />
        <h1>{title}</h1>
        <div class="page-actions">
          <button
            type="button"
            class="search-button"
            onClick={() => {
              setInitialQuery('');
              setDialog('search');
            }}
          >
            <Icon name="search" size={18} />
            <span>{t('search.open')}</span>
            <kbd aria-hidden="true">/</kbd>
          </button>
          <button type="button" class="icon-button" aria-label={t('settings.open')} onClick={() => setDialog('settings')}>
            <Icon name="settings" />
          </button>
        </div>
      </header>
      <main id="content" tabIndex={-1}>
        <div role="status" aria-live="polite">
          {!state && !error && <p class="visually-hidden">{t('page.loading')}</p>}
          {status === 'reconnecting' && !error && <p class="notice">{t('page.reconnecting')}</p>}
          {syncing && <p class="notice">{t('page.syncing')}</p>}
          {stale.length > 0 && (
            <p class="notice">{t('page.stale', { clusters: stale.map((cluster) => cluster.name).join(', ') })}</p>
          )}
          {empty && !syncing && <p class="notice">{t('page.empty')}</p>}
        </div>
        {error && (
          <div class="notice notice-error" role="alert">
            <p>{t('page.newerProtocol')}</p>
            <button type="button" onClick={() => window.location.reload()}>
              {t('page.reload')}
            </button>
          </div>
        )}
        {!state && !error && <Skeleton />}
        {kinds.length === 2 ? (
          // Both kinds exist: one tab each, opening on the applications.
          // The tabs sit at the top right, above the favorites.
          <>
            <Tabs
              id="tiles"
              label={t('section.kinds')}
              tabs={kinds.map((key) => ({ key, label: t(`section.${key}`) }))}
              selected={view}
              onSelect={setChosen}
            />
            <div role="tabpanel" id="tiles-panel" aria-labelledby={`tiles-tab-${view}`}>
              <Favorites tiles={favorites} iconColor={iconColor} />
              <Section id={view} groups={groups} iconColor={iconColor} aligned={view === 'bookmarks'} />
            </div>
          </>
        ) : (
          // Only one kind: no tabs to choose between, just its heading.
          kinds.map((kind) => (
            <Fragment key={kind}>
              <Favorites tiles={favorites} iconColor={iconColor} />
              <Section
                id={kind}
                title={t(`section.${kind}`)}
                groups={groups}
                iconColor={iconColor}
                aligned={kind === 'bookmarks'}
              />
            </Fragment>
          ))
        )}
      </main>
      {dialog === 'search' && state && (
        <Spotlight
          tiles={tiles}
          initialQuery={initialQuery}
          iconColor={iconColor}
          searchEngine={state.config.searchEngine}
          showCluster={state.clusters.length > 1}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog === 'settings' && <Settings onClose={() => setDialog(null)} />}
    </>
  );
}
