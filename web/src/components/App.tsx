import { Fragment } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { groupCards, toCards } from '../cards';
import { clusterColors, orderClusters } from '../clusters';
import { chooseLanguage, setLanguage, t } from '../i18n';
import { clusterShown, prefs } from '../prefs';
import { connect, connection, fatalError, serverState, type EventStream } from '../state';
import { filterByTags, tagsFromPath } from '../tags';
import { applyAppearance, panelMode, resolveMode, systemPrefersDark } from '../theme';
import { Background } from './Background';
import { ClusterChips } from './ClusterChips';
import { Icon } from './Icons';
import { availableUpdate, Footer, useVersion } from './Footer';
import { GitHubCorner } from './GitHubCorner';
import { Favorites, Section } from './Section';
import { Settings } from './Settings';
import { Skeleton } from './Skeleton';
import { Spotlight } from './Spotlight';
import { Tabs } from './Tabs';

type Kind = 'applications' | 'bookmarks';

// True while the keyboard is being used to type somewhere.
const typing = (target: EventTarget | null) =>
  target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));

export function App({
  open,
  fetchVersion,
}: {
  open?: (url: string) => EventStream;
  fetchVersion?: typeof fetch;
}) {
  useEffect(() => connect(open), [open]);

  const state = serverState.value;
  const error = fatalError.value;
  const status = connection.value;
  const p = prefs.value;
  const [dialog, setDialog] = useState<'search' | 'settings' | null>(null);
  const versionInfo = useVersion(fetchVersion);
  const update = availableUpdate(versionInfo);
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
  const mode = panelMode(p) ?? resolveMode(p.theme, systemDark);
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
  // Clusters the visitor has not hidden. Tiles of several clusters carry
  // the name of theirs.
  const clusters = state?.clusters ?? [];
  const showAll = state?.config.showAllClusters ?? false;
  const shown = clusters.filter((cluster) => clusterShown(p, cluster, showAll));
  const shownNames = shown.map((cluster) => cluster.name);
  const showCluster = shown.length > 1;
  // A tile is left out when its cluster is one that is not shown. A tile
  // of a cluster the server does not list is kept: there is nothing to say
  // it should be hidden.
  const notShown = clusters.filter((cluster) => !shownNames.includes(cluster.name)).map((cluster) => cluster.name);
  const visible = tagged.filter((tile) => !notShown.includes(tile.cluster) && !p.hiddenClusters.includes(tile.cluster));
  const tiles = p.layout.hideUnreachable ? visible.filter((tile) => tile.available !== false) : visible;
  // The same service on several clusters is one card, unless the visitor
  // prefers them apart. The local cluster comes first.
  const order = orderClusters(shown).map((cluster) => cluster.name);
  // With a section per cluster a card belongs to one cluster, so nothing
  // is combined.
  const byCluster = p.layout.byCluster && showCluster;
  const cards = toCards(tiles, p.layout.combine && showCluster && !byCluster, order);
  // Favorites are shown once, in their own row and in the visitor's order,
  // and are left out of the groups below. A combined card is a favorite
  // when any of its tiles is.
  const favoriteIndex = (card: (typeof cards)[number]) =>
    Math.min(...card.members.map((member) => p.favorites.indexOf(member.id)).filter((index) => index >= 0));
  const allFavorites = cards
    .filter((card) => card.members.some((member) => p.favorites.includes(member.id)))
    .sort((a, b) => favoriteIndex(a) - favoriteIndex(b));
  const others = cards.filter((card) => !allFavorites.includes(card));
  const applications = groupCards(others, 'application');
  const bookmarks = groupCards(others, 'bookmark');
  // The tab the visitor picked, for as long as it has something to show.
  const kinds: Kind[] = [
    ...(tiles.some((tile) => tile.kind === 'application') ? (['applications'] as const) : []),
    ...(tiles.some((tile) => tile.kind === 'bookmark') ? (['bookmarks'] as const) : []),
  ];
  const view: Kind = chosen && kinds.includes(chosen) ? chosen : (kinds[0] ?? 'applications');
  // Each tab has its own favorites row.
  const favorites = allFavorites.filter(
    (card) => card.primary.kind === (view === 'applications' ? 'application' : 'bookmark'),
  );
  const groups = view === 'applications' ? applications : bookmarks;
  // One section per cluster that has something to show, the local one
  // first. A cluster the server does not list comes last.
  const rank = (name: string) => (order.includes(name) ? order.indexOf(name) : order.length);
  const sections = byCluster
    ? [...new Set(groups.flatMap((group) => group.cards.map((card) => card.primary.cluster)))]
        .sort((a, b) => rank(a) - rank(b) || a.localeCompare(b))
        .map((cluster) => ({
          cluster,
          groups: groups
            .map((group) => ({ ...group, cards: group.cards.filter((card) => card.primary.cluster === cluster) }))
            .filter((group) => group.cards.length > 0),
        }))
    : null;
  // The tiles of one kind: in one set of groups, or in one per cluster. In
  // a cluster's section the heading says whose the tiles are, so they
  // carry no pill.
  const sectionsOf = (kind: Kind, title?: string) =>
    sections ? (
      sections.map((section) => (
        <Section
          key={section.cluster}
          id={`${kind}-${section.cluster.replace(/[^a-z0-9]+/gi, '-')}`}
          title={section.cluster}
          color={clusterColors.value[section.cluster]}
          groups={section.groups}
          iconColor={iconColor}
          aligned={kind === 'bookmarks'}
        />
      ))
    ) : (
      <Section
        id={kind}
        title={title}
        groups={groups}
        iconColor={iconColor}
        aligned={kind === 'bookmarks'}
        showCluster={showCluster}
      />
    );
  // The local cluster may still be read for the first time. Any other state
  // that is not "connected" means the tiles of that cluster are the last
  // known ones, or that it has not been reached at all.
  const syncing = clusters.some((cluster) => cluster.local && cluster.state === 'syncing');
  const stale = shown.filter((cluster) => cluster.state !== 'connected' && !(cluster.local && cluster.state === 'syncing'));
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
      {(versionInfo?.githubLink || update) && <GitHubCorner update={update} />}
      <header class="page-header">
        {/* Decorative: the heading next to it names the page. */}
        <img class="logo" src="/logo.svg" alt="" width="72" height="72" />
        <h1>{title}</h1>
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
        {(clusters.length > 1 || kinds.length === 2) && (
          // The clusters to show on the left, the kinds of tiles on the right.
          <div class="toolbar">
            <ClusterChips clusters={clusters} shown={shownNames} />
            {kinds.length === 2 && (
              <Tabs
                id="tiles"
                label={t('section.kinds')}
                tabs={kinds.map((key) => ({ key, label: t(`section.${key}`) }))}
                selected={view}
                onSelect={setChosen}
              />
            )}
          </div>
        )}
        {kinds.length === 2 ? (
          // Both kinds exist: one tab each, opening on the applications.
          <>
            <div role="tabpanel" id="tiles-panel" aria-labelledby={`tiles-tab-${view}`}>
              <Favorites cards={favorites} iconColor={iconColor} showCluster={showCluster} />
              {sectionsOf(view)}
            </div>
          </>
        ) : (
          // Only one kind: no tabs to choose between, just its heading.
          kinds.map((kind) => (
            <Fragment key={kind}>
              <Favorites cards={favorites} iconColor={iconColor} showCluster={showCluster} />
              {sectionsOf(kind, t(`section.${kind}`))}
            </Fragment>
          ))
        )}
      </main>
      <Footer info={versionInfo} />
      {/* The page's own controls sit in the bottom right corner of the
          window, out of the way of the content. Search has no button on a
          device with a keyboard: it opens when you start typing. A touch
          screen has no keys to start typing on, so there it gets one. */}
      <div class="corner-actions">
        <button
          type="button"
          class="icon-button touch-only"
          aria-label={t('search.open')}
          onClick={() => {
            setInitialQuery('');
            setDialog('search');
          }}
        >
          <Icon name="search" />
        </button>
        <button type="button" class="icon-button" aria-label={t('settings.open')} onClick={() => setDialog('settings')}>
          <Icon name="settings" />
        </button>
      </div>
      {dialog === 'search' && state && (
        <Spotlight
          tiles={tiles}
          initialQuery={initialQuery}
          iconColor={iconColor}
          searchEngine={state.config.searchEngine}
          showCluster={showCluster}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog === 'settings' && <Settings clusters={clusters} shownClusters={shownNames} onClose={() => setDialog(null)} />}
    </>
  );
}
