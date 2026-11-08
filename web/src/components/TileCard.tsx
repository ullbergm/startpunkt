import { t } from '../i18n';
import { prefs, toggleFavorite } from '../prefs';
import type { Tile } from '../types';
import { safeHref } from '../url';
import { Icon } from './Icons';
import { TileIcon } from './TileIcon';

export function TileCard({ tile, iconColor }: { tile: Tile; iconColor: string }) {
  const { layout, favorites } = prefs.value;
  const href = safeHref(tile.url);
  // Only a probe that failed marks a tile. Without a result nothing is shown.
  const unavailable = tile.available === false;
  const favorite = favorites.includes(tile.id);
  const body = (
    <>
      <TileIcon tile={tile} color={iconColor} />
      <span class="tile-text">
        <span class="tile-name">{tile.name}</span>
        {layout.showDescription && tile.info && <span class="tile-info">{tile.info}</span>}
      </span>
      {/* Said in words, not only by dimming, and part of the link's name. */}
      {unavailable && layout.showStatus && <span class="tile-badge">{t('tile.offline')}</span>}
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
