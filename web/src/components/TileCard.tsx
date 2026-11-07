import type { Tile } from '../types';
import { safeHref } from '../url';
import { TileIcon } from './TileIcon';

export function TileCard({ tile }: { tile: Tile }) {
  const href = safeHref(tile.url);
  const body = (
    <>
      <TileIcon tile={tile} />
      <span class="tile-text">
        <span class="tile-name">{tile.name}</span>
        {tile.info && <span class="tile-info">{tile.info}</span>}
      </span>
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
      class="tile"
      href={href}
      target={tile.targetBlank ? '_blank' : undefined}
      rel={tile.targetBlank ? 'noopener noreferrer' : undefined}
    >
      {body}
    </a>
  );
}
