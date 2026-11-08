import type { TileGroup } from '../group';
import { t } from '../i18n';
import { useEffect, useState } from 'preact/hooks';
import { columnsThatFit, MAX_AUTO_COLUMNS, optimalColumns } from '../columns';
import { moveFavorite, prefs, toggleCollapsed } from '../prefs';
import type { Tile } from '../types';
import { Icon } from './Icons';
import { TileCard } from './TileCard';

// The widest a list may get, following the width of the window.
function useColumnsThatFit(): number {
  const [fit, setFit] = useState(() => columnsThatFit(window.innerWidth));
  useEffect(() => {
    const onResize = () => setFit(columnsThatFit(window.innerWidth));
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return fit;
}

// The number of columns for a list of the given length: the visitor's fixed
// number, or on "auto" the number that needs the fewest rows. Either way
// never more than the window has room for.
function useColumns(count: number): number {
  const fit = useColumnsThatFit();
  const fixed = prefs.value.layout.columns;
  return fixed > 0 ? Math.min(fixed, fit) : optimalColumns(count, Math.min(MAX_AUTO_COLUMNS, fit));
}

// sizeFor is the length the columns are worked out for. It is the list's
// own length unless several lists are to line up with each other.
function Tiles({
  tiles,
  iconColor,
  sizeFor,
  showCluster,
}: {
  tiles: Tile[];
  iconColor: string;
  sizeFor?: number;
  showCluster?: boolean;
}) {
  const columns = useColumns(sizeFor ?? tiles.length);
  return (
    <ul class="tiles" style={{ '--columns': String(columns) }}>
      {tiles.map((tile) => (
        <li key={tile.id}>
          <TileCard tile={tile} iconColor={iconColor} showCluster={showCluster} />
        </li>
      ))}
    </ul>
  );
}

// The favorites, in the visitor's own order. A favorite is moved by
// dragging it onto another one, or with the buttons on its tile, which do
// the same from the keyboard. Each move is announced.
//
// The row has no heading of its own. It is as wide as its favorites need,
// and a row that is not full is centred.
export function Favorites({
  tiles,
  iconColor,
  showCluster,
}: {
  tiles: Tile[];
  iconColor: string;
  showCluster?: boolean;
}) {
  const columns = Math.min(useColumns(tiles.length), Math.max(tiles.length, 1));
  const [dragged, setDragged] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState('');
  if (tiles.length === 0) return null;

  const move = (tile: Tile, toIndex: number) => {
    if (toIndex < 0 || toIndex >= tiles.length) return;
    // The stored list may hold favorites that are not shown right now, so
    // the new place is given as the place of the tile it is moved onto.
    const stored = prefs.value.favorites;
    moveFavorite(tile.id, stored.indexOf(tiles[toIndex]!.id));
    setAnnouncement(t('favorites.moved', { name: tile.name, position: toIndex + 1, count: tiles.length }));
  };

  return (
    <section class="favorites" aria-label={t('section.favorites')}>
      <ul class="tiles tiles-centred" style={{ '--columns': String(columns) }}>
        {tiles.map((tile, index) => (
          <li
            key={tile.id}
            class={over === tile.id && dragged !== tile.id ? 'drop-target' : undefined}
            draggable={tiles.length > 1}
            onDragStart={(event) => {
              setDragged(tile.id);
              event.dataTransfer?.setData('text/plain', tile.name);
              if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
            }}
            onDragOver={(event) => {
              if (dragged === null) return;
              event.preventDefault();
              setOver(tile.id);
            }}
            onDragLeave={() => setOver((current) => (current === tile.id ? null : current))}
            onDrop={(event) => {
              event.preventDefault();
              const from = tiles.find((other) => other.id === dragged);
              if (from && from.id !== tile.id) move(from, index);
              setDragged(null);
              setOver(null);
            }}
            onDragEnd={() => {
              setDragged(null);
              setOver(null);
            }}
          >
            <TileCard
              tile={tile}
              iconColor={iconColor}
              showCluster={showCluster}
              reorder={
                tiles.length > 1
                  ? { first: index === 0, last: index === tiles.length - 1, onMove: (delta) => move(tile, index + delta) }
                  : undefined
              }
            />
          </li>
        ))}
      </ul>
      <p class="visually-hidden" role="status">
        {announcement}
      </p>
    </section>
  );
}

// The tiles of one kind, in groups that can be collapsed.
//
// With a title it is a section of its own under that heading. Without one
// it is the content of a tab, and the tab names it.
//
// With aligned set, every group uses the columns of the largest one, so
// that the tiles of all groups line up under each other.
export function Section({
  id,
  title,
  groups,
  iconColor,
  aligned = false,
  showCluster,
}: {
  showCluster?: boolean;
  id: string;
  title?: string;
  groups: TileGroup[];
  iconColor: string;
  aligned?: boolean;
}) {
  if (groups.length === 0) return null;
  const largest = aligned ? Math.max(...groups.map((group) => group.tiles.length)) : undefined;
  const collapsed = prefs.value.collapsed;
  const Wrapper = title ? 'section' : 'div';
  return (
    <Wrapper aria-labelledby={title ? id : undefined}>
      {title && <h2 id={id}>{title}</h2>}
      {groups.map((group) => {
        const key = `${id}:${group.name}`;
        const groupId = `${id}-${group.name.replace(/[^a-z0-9]+/gi, '-')}`;
        const open = !collapsed.includes(key);
        return (
          <section class="group" aria-labelledby={groupId} key={group.name}>
            <h3 id={groupId}>
              <button
                type="button"
                class="group-toggle"
                aria-expanded={open}
                aria-controls={`${groupId}-tiles`}
                title={t(open ? 'group.collapse' : 'group.expand', { group: group.name })}
                onClick={() => toggleCollapsed(key)}
              >
                <Icon name="chevron" size={16} />
                {group.name}
              </button>
            </h3>
            <div id={`${groupId}-tiles`} hidden={!open}>
              {open && <Tiles tiles={group.tiles} iconColor={iconColor} sizeFor={largest} showCluster={showCluster} />}
            </div>
          </section>
        );
      })}
    </Wrapper>
  );
}
