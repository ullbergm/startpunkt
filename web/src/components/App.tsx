import { useEffect, useState } from 'preact/hooks';
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
      const shortcut =
        (event.key === '/' && !typing(event.target) && !event.ctrlKey && !event.metaKey && !event.altKey) ||
        (event.key.toLowerCase() === 'k' && (event.ctrlKey || event.metaKey));
      if (shortcut) {
        event.preventDefault();
        setDialog('search');
      }
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
  const favorites = p.favorites.flatMap((id) => byId.get(id) ?? []);
  const others = tiles.filter((tile) => !p.favorites.includes(tile.id));
  const applications = groupTiles(others, 'application');
  const bookmarks = groupTiles(others, 'bookmark');
  // The tab the visitor picked, for as long as it has something to show.
  const kinds: Kind[] = [
    ...(applications.length > 0 ? (['applications'] as const) : []),
    ...(bookmarks.length > 0 ? (['bookmarks'] as const) : []),
  ];
  const view: Kind = chosen && kinds.includes(chosen) ? chosen : (kinds[0] ?? 'applications');
  const syncing = state?.clusters.some((cluster) => cluster.state === 'syncing') ?? false;
  const stale = state?.clusters.filter((cluster) => cluster.state === 'stale') ?? [];
  const empty = state !== null && tiles.length === 0;
  const iconColor = palette?.textPrimaryColor ?? '#4c8dd6';

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
          <button type="button" class="search-button" onClick={() => setDialog('search')}>
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
          {!state && !error && <p class="notice">{t('page.loading')}</p>}
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
        <Favorites tiles={favorites} iconColor={iconColor} />
        {kinds.length === 2 ? (
          // Both kinds exist: one tab each, opening on the applications.
          <>
            <Tabs
              id="tiles"
              label={t('section.kinds')}
              tabs={kinds.map((key) => ({ key, label: t(`section.${key}`) }))}
              selected={view}
              onSelect={setChosen}
            />
            <div role="tabpanel" id="tiles-panel" aria-labelledby={`tiles-tab-${view}`}>
              <Section id={view} groups={view === 'applications' ? applications : bookmarks} iconColor={iconColor} />
            </div>
          </>
        ) : (
          // Only one kind: no tabs to choose between, just its heading.
          kinds.map((kind) => (
            <Section
              key={kind}
              id={kind}
              title={t(`section.${kind}`)}
              groups={kind === 'applications' ? applications : bookmarks}
              iconColor={iconColor}
            />
          ))
        )}
      </main>
      {dialog === 'search' && state && (
        <Spotlight
          tiles={tiles}
          searchEngine={state.config.searchEngine}
          showCluster={state.clusters.length > 1}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog === 'settings' && <Settings onClose={() => setDialog(null)} />}
    </>
  );
}
