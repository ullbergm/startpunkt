import type { TileGroup } from '../group';
import { t } from '../i18n';
import { prefs, toggleCollapsed } from '../prefs';
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

// A flat list of tiles under one heading, used for the favorites.
export function TileList({ id, title, tiles, iconColor }: { id: string; title: string; tiles: Tile[]; iconColor: string }) {
  if (tiles.length === 0) return null;
  return (
    <section aria-labelledby={id}>
      <h2 id={id}>{title}</h2>
      <Tiles tiles={tiles} iconColor={iconColor} />
    </section>
  );
}

// The tiles of one kind, in groups that can be collapsed.
export function Section({
  id,
  title,
  groups,
  iconColor,
}: {
  id: string;
  title: string;
  groups: TileGroup[];
  iconColor: string;
}) {
  if (groups.length === 0) return null;
  const collapsed = prefs.value.collapsed;
  return (
    <section aria-labelledby={id}>
      <h2 id={id}>{title}</h2>
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
    </section>
  );
}
