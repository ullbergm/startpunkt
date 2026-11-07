import { useEffect } from 'preact/hooks';
import { groupTiles, type TileGroup } from '../group';
import { load, loadError, serverState } from '../state';
import { filterByTags, tagsFromPath } from '../tags';
import { TileCard } from './TileCard';

function Section({ id, title, groups }: { id: string; title: string; groups: TileGroup[] }) {
  if (groups.length === 0) return null;
  return (
    <section aria-labelledby={id}>
      <h2 id={id}>{title}</h2>
      {groups.map((group) => {
        const groupId = `${id}-${group.name.replace(/[^a-z0-9]+/gi, '-')}`;
        return (
          <section class="group" aria-labelledby={groupId} key={group.name}>
            <h3 id={groupId}>{group.name}</h3>
            <ul class="tiles">
              {group.tiles.map((tile) => (
                <li key={tile.id}>
                  <TileCard tile={tile} />
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </section>
  );
}

export function App() {
  useEffect(() => {
    void load();
    // Until the page follows the event stream, refresh when it is looked at
    // again.
    const refresh = () => {
      if (document.visibilityState === 'visible') void load();
    };
    document.addEventListener('visibilitychange', refresh);
    return () => document.removeEventListener('visibilitychange', refresh);
  }, []);

  const state = serverState.value;
  const error = loadError.value;
  const title = state?.config.title || 'Startpunkt';
  useEffect(() => {
    document.title = title;
  }, [title]);

  // The tag filter is part of the URL, so a filtered page can be bookmarked.
  const tiles = state ? filterByTags(state.tiles, tagsFromPath(window.location.pathname)) : [];
  const applications = groupTiles(tiles, 'application');
  const bookmarks = groupTiles(tiles, 'bookmark');
  const syncing = state?.clusters.some((cluster) => cluster.state === 'syncing') ?? false;
  const stale = state?.clusters.filter((cluster) => cluster.state === 'stale') ?? [];
  const empty = state !== null && tiles.length === 0;

  return (
    <>
      <header class="page-header">
        {/* Decorative: the heading next to it names the page. */}
        <img class="logo" src="/logo.svg" alt="" width="40" height="40" />
        <h1>{title}</h1>
      </header>
      <main>
        <div role="status" aria-live="polite">
          {!state && !error && <p class="notice">Loading…</p>}
          {syncing && <p class="notice">Still reading the cluster. More tiles may appear.</p>}
          {stale.length > 0 && (
            <p class="notice">
              Not connected to {stale.map((cluster) => cluster.name).join(', ')}. Showing the last
              known tiles.
            </p>
          )}
          {empty && !syncing && (
            <p class="notice">There are no applications or bookmarks to show yet.</p>
          )}
        </div>
        {error && (
          <div class="notice notice-error" role="alert">
            <p>Could not load the start page. {error}</p>
            <button type="button" onClick={() => void load()}>
              Try again
            </button>
          </div>
        )}
        <Section id="applications" title="Applications" groups={applications} />
        <Section id="bookmarks" title="Bookmarks" groups={bookmarks} />
      </main>
    </>
  );
}
