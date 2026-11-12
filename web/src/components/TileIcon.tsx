import { useState } from 'preact/hooks';
import type { Tile } from '../types';
import { iconSource } from '../url';

// The icon is decorative: the tile's name is right next to it. An Iconify
// icon without a colour of its own takes the colour it is given.
export function TileIcon({ tile, color }: { tile: Tile; color: string }) {
  const source = iconSource(tile.icon, tile.iconColor || color);
  const [failed, setFailed] = useState<string | null>(null);
  if (!source || failed === source) {
    return (
      <span class="tile-icon tile-icon-fallback" aria-hidden="true">
        {[...tile.name.trim()][0]?.toUpperCase() ?? '?'}
      </span>
    );
  }
  return (
    <img
      class="tile-icon"
      src={source}
      alt=""
      width="40"
      height="40"
      loading="lazy"
      referrerpolicy="no-referrer"
      onError={() => setFailed(source)}
    />
  );
}
