import { t } from '../i18n';
import { prefs, toggleFavorite } from '../prefs';
import type { Tile } from '../types';
import { safeHref } from '../url';
import { FitText } from './FitText';
import { Icon } from './Icons';
import { TileIcon } from './TileIcon';

// The controls that move a favorite, for those who do not drag.
export interface Reorder {
  first: boolean;
  last: boolean;
  onMove: (delta: -1 | 1) => void;
}

export function TileCard({
  tile,
  iconColor,
  reorder,
  showCluster = false,
}: {
  tile: Tile;
  iconColor: string;
  reorder?: Reorder;
  // Name the cluster on the tile, when tiles of several clusters are shown.
  showCluster?: boolean;
}) {
  const { layout, favorites } = prefs.value;
  const href = safeHref(tile.url);
  // Only a probe that failed marks a tile. Without a result nothing is shown.
  const unavailable = tile.available === false;
  const favorite = favorites.includes(tile.id);
  const body = (
    <>
      <TileIcon tile={tile} color={iconColor} />
      <span class="tile-text">
        <span class="tile-name">
          {tile.name}
          {showCluster && (
            <span class="tile-cluster" aria-label={t('tile.cluster', { cluster: tile.cluster })}>
              {tile.cluster}
            </span>
          )}
        </span>
        {layout.showDescription && tile.info && (
          <FitText class="tile-info" text={tile.info} lines={layout.descriptionLines} />
        )}
        {layout.showTags && tile.tags.length > 0 && (
          <span class="tile-tags" aria-label={t('tile.tags', { tags: tile.tags.join(', ') })}>
            {tile.tags.map((tag) => (
              <span class="tile-tag" key={tag}>
                {tag}
              </span>
            ))}
          </span>
        )}
        {/* Said in words, not only by dimming, and part of the link's name. */}
        {unavailable && layout.showStatus && <span class="tile-badge">{t('tile.offline')}</span>}
      </span>
    </>
  );
  return (
    <div class={unavailable && layout.showStatus ? 'tile tile-unavailable' : 'tile'}>
      {href ? (
        <a
          class="tile-link"
          href={href}
          target={tile.targetBlank ? '_blank' : undefined}
          rel={tile.targetBlank ? 'noopener noreferrer' : undefined}
        >
          {body}
        </a>
      ) : (
        <div class="tile-link tile-disabled" title={t('tile.noLink')}>
          {body}
        </div>
      )}
      {reorder && (
        <span class="tile-move">
          <button
            type="button"
            aria-label={t('favorites.moveEarlier', { name: tile.name })}
            disabled={reorder.first}
            onClick={() => reorder.onMove(-1)}
          >
            <Icon name="left" size={16} />
          </button>
          <button
            type="button"
            aria-label={t('favorites.moveLater', { name: tile.name })}
            disabled={reorder.last}
            onClick={() => reorder.onMove(1)}
          >
            <Icon name="right" size={16} />
          </button>
        </span>
      )}
      {/* Next to the link, not inside it: a button in a link is not valid
          and cannot be reached separately with the keyboard. */}
      <button
        type="button"
        class="tile-favorite"
        aria-pressed={favorite}
        aria-label={t(favorite ? 'tile.removeFavorite' : 'tile.addFavorite', { name: tile.name })}
        onClick={() => toggleFavorite([tile.id])}
      >
        <Icon name={favorite ? 'star' : 'starOutline'} size={18} />
      </button>
    </div>
  );
}
