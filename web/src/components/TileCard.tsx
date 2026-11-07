import type { Tile } from '../types';
import { safeHref } from '../url';
import { TileIcon } from './TileIcon';

export function TileCard({ tile }: { tile: Tile }) {
  const href = safeHref(tile.url);
  // Only a probe that failed marks a tile. Without a result nothing is shown.
  const unavailable = tile.available === false;
  const body = (
    <>
      <TileIcon tile={tile} />
      <span class="tile-text">
        <span class="tile-name">{tile.name}</span>
        {tile.info && <span class="tile-info">{tile.info}</span>}
      </span>
      {/* Said in words, not only by dimming, and part of the link's name. */}
      {unavailable && <span class="tile-badge">Offline</span>}
    </>
  );
  if (!href) {
    return (
      <div class="tile tile-disabled" title="This tile has no usable link.">
        {body}
      </div>
    );
  }
  return (
    <a
      class={unavailable ? 'tile tile-unavailable' : 'tile'}
      href={href}
      target={tile.targetBlank ? '_blank' : undefined}
      rel={tile.targetBlank ? 'noopener noreferrer' : undefined}
    >
      {body}
    </a>
  );
}
