import type { TileGroup } from '../group';
import { t } from '../i18n';
import { useState } from 'preact/hooks';
import { moveFavorite, prefs, toggleCollapsed } from '../prefs';
import type { Tile } from '../types';
import { Icon } from './Icons';
import { TileCard } from './TileCard';

function Tiles({ tiles, iconColor }: { tiles: Tile[]; iconColor: string }) {
  return (
    <ul class="tiles">
      {tiles.map((tile) => (
        <li key={tile.id}>
          <TileCard tile={tile} iconColor={iconColor} />
        </li>
      ))}
    </ul>
  );
}

// The favorites, in the visitor's own order. A favorite is moved by
// dragging it onto another one, or with the buttons on its tile, which do
// the same from the keyboard. Each move is announced.
export function Favorites({ tiles, iconColor }: { tiles: Tile[]; iconColor: string }) {
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
    <section aria-labelledby="favorites">
      <h2 id="favorites">{t('section.favorites')}</h2>
      <ul class="tiles" title={tiles.length > 1 ? t('favorites.help') : undefined}>
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
export function Section({
  id,
  title,
  groups,
  iconColor,
}: {
  id: string;
  title?: string;
  groups: TileGroup[];
  iconColor: string;
}) {
  if (groups.length === 0) return null;
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
              {open && <Tiles tiles={group.tiles} iconColor={iconColor} />}
            </div>
          </section>
        );
      })}
    </Wrapper>
  );
}
