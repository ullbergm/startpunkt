import { useState } from 'preact/hooks';
import type { Tile } from '../types';
import { iconSource } from '../url';

// Used for Iconify icons that do not set a colour. It is readable on both
// the light and the dark background.
export const DEFAULT_ICON_COLOR = '#4c8dd6';

// The icon is decorative: the tile's name is right next to it.
export function TileIcon({ tile }: { tile: Tile }) {
  const source = iconSource(tile.icon, tile.iconColor || DEFAULT_ICON_COLOR);
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
