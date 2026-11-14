import { editMode, editTarget, fixed, targetOf, whyFixed } from '../editing';
import { serverState } from '../state';
import type { Card } from '../cards';
import { clusterColors } from '../clusters';
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

// One cluster of a card. On a card that stands for several clusters each
// pill is a link to that cluster's instance of the service and says, in its
// name and with a mark, whether that instance answers.
function Pill({ tile, link }: { tile: Tile; link: boolean }) {
  const state =
    tile.available === true ? 'available' : tile.available === false ? 'unavailable' : 'unknown';
  const label = t(`pill.${state}`, { name: tile.name, cluster: tile.cluster });
  const body = (
    <>
      {/* Filled or hollow, so that the state is not told by colour alone. */}
      {state !== 'unknown' && (
        <span class={`pill-mark pill-${state}`} aria-hidden="true">
          {state === 'available' ? '●' : '○'}
        </span>
      )}
      {tile.cluster}
    </>
  );
  const href = link ? safeHref(tile.url) : null;
  // The cluster's own colour, the same as on its button above the tiles.
  const style = { '--cluster': clusterColors.value[tile.cluster] ?? 'currentColor' };
  return href ? (
    <a
      class="pill"
      style={style}
      href={href}
      aria-label={label}
      title={label}
      target={tile.targetBlank ? '_blank' : undefined}
      rel={tile.targetBlank ? 'noopener noreferrer' : undefined}
    >
      {body}
    </a>
  ) : (
    <span class="pill" style={style} aria-label={label} title={label}>
      {body}
    </span>
  );
}

// Kubernetes readiness is shown separately from HTTP availability. A
// login page can answer while its application workload is still starting.
function WorkloadStatus({ tile, combined }: { tile: Tile; combined: boolean }) {
  const workload = tile.workload;
  if (!workload) return null;
  const status = t(`tile.workload.${workload.state}`, { ready: workload.ready, desired: workload.desired });
  const symbol = { ready: '✓', starting: '◌', degraded: '!', unknown: '?' }[workload.state];
  return (
    <span class={`tile-workload workload-${workload.state}`}>
      <span aria-hidden="true">{symbol} </span>
      {combined ? t('tile.workload.cluster', { cluster: tile.cluster, status }) : status}
    </span>
  );
}

function ConsoleLink({ tile, combined }: { tile: Tile; combined: boolean }) {
  const address = tile.consoleURL && /^https?:\/\//i.test(tile.consoleURL) ? safeHref(tile.consoleURL) : null;
  if (!address) return null;
  return (
    <a
      href={address}
      target={tile.targetBlank ? '_blank' : undefined}
      rel={tile.targetBlank ? 'noopener noreferrer' : undefined}
    >
      {t(combined ? 'tile.console.cluster' : 'tile.console', { name: tile.name, cluster: tile.cluster })}
    </a>
  );
}

export function TileCard({
  card,
  iconColor,
  reorder,
  showCluster = false,
}: {
  card: Card;
  iconColor: string;
  reorder?: Reorder;
  // Name the clusters on the card, when tiles of several clusters are shown.
  showCluster?: boolean;
}) {
  const { layout, favorites } = prefs.value;
  const tile = card.primary;
  const combined = card.members.length > 1;
  const href = safeHref(tile.url);
  // Only a probe that failed marks a card, and a combined card only when
  // every one of its clusters failed: the pills tell them apart.
  const unavailable = card.members.every((member) => member.available === false);
  const ids = card.members.map((member) => member.id);
  // A combined card is a favorite when any of its tiles is, and the star
  // adds or removes all of them.
  const favorite = ids.some((id) => favorites.includes(id));
  // The controls of a tile are there only while the page is being edited.
  const arranging = editMode.value;
  // On an instance with editing, a tile that is an Application or a
  // Bookmark of this cluster can be changed. On a combined card that is the
  // local cluster's tile. The key has been given: on such an instance the
  // page is not edited without it.
  const editable =
    arranging && serverState.value?.editing.available === true
      ? (card.members.map(targetOf).find((target) => target !== null) ?? null)
      : null;
  const body = (
    <>
      <TileIcon tile={tile} color={iconColor} />
      <span class="tile-text">
        <span class="tile-name">{tile.name}</span>
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
      <div class="tile-main">
        {/* While the page is being edited no tile is a link: a click is
            about the tile, not a way to the service. One that can be
            changed opens its form, and any other says why it cannot. */}
        {editable ? (
          <button
            type="button"
            class="tile-link tile-change"
            aria-label={t('edit.change', { name: tile.name })}
            onClick={() => (editTarget.value = editable)}
          >
            {body}
            <span class="tile-edit" aria-hidden="true">
              <Icon name="edit" size={16} />
            </span>
          </button>
        ) : arranging ? (
          <button
            type="button"
            class="tile-link tile-change"
            aria-label={t('edit.fixed.label', { name: tile.name })}
            onClick={() => (fixed.value = whyFixed(tile))}
          >
            {body}
            <span class="tile-edit" aria-hidden="true">
              <Icon name="locked" size={16} />
            </span>
          </button>
        ) : href ? (
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
        {layout.showStatus && card.members.some((member) => member.workload) && (
          <div class="tile-workloads">
            {card.members.map((member) => <WorkloadStatus key={member.id} tile={member} combined={combined} />)}
          </div>
        )}
        {!arranging && card.members.some((member) => member.links?.length || member.consoleURL) && (
          <div class="tile-secondary-links">
            {card.members.flatMap((member) =>
              (member.links ?? []).map((link, index) => {
                const address = /^https?:\/\//i.test(link.url) ? safeHref(link.url) : null;
                return address ? (
                  <a
                    key={`${member.id}/${index}`}
                    href={address}
                    aria-label={combined ? `${link.name} · ${member.cluster}` : undefined}
                    target={member.targetBlank ? '_blank' : undefined}
                    rel={member.targetBlank ? 'noopener noreferrer' : undefined}
                  >
                    {link.name}{combined && <span class="secondary-cluster"> · {member.cluster}</span>}
                  </a>
                ) : null;
              }),
            )}
            {card.members.map((member) => <ConsoleLink key={member.id} tile={member} combined={combined} />)}
          </div>
        )}
        {/* Next to the card's link, not inside it: a link in a link is not
            valid, and each cluster has to be reachable on its own. */}
        {showCluster && (
          <span class="tile-pills">
            {card.members.map((member) => (
              <Pill key={member.id} tile={member} link={combined && !arranging} />
            ))}
          </span>
        )}
      </div>
      {arranging && reorder && (
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
      {arranging && (
        <button
          type="button"
          class="tile-favorite"
          aria-pressed={favorite}
          aria-label={t(favorite ? 'tile.removeFavorite' : 'tile.addFavorite', { name: tile.name })}
          onClick={() => toggleFavorite(ids)}
        >
          <Icon name={favorite ? 'star' : 'starOutline'} size={18} />
        </button>
      )}
    </div>
  );
}
