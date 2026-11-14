import { clusterFreshness } from '../freshness';
import { t } from '../i18n';
import type { Cluster } from '../types';

// Kept outside the connection live region: advancing a duration should not
// announce the same disconnection again every half minute.
export function ClusterFreshness({ cluster, now }: { cluster: Cluster; now: number }) {
  const fresh = clusterFreshness(cluster, now);
  return (
    <span class="cluster-freshness" aria-live="off">
      {cluster.name}: {' '}
      {fresh.lastSeen && <>{t('clusters.freshness.lastSeenLabel')} <time dateTime={fresh.lastSeen.dateTime}>{fresh.lastSeen.label}</time></>}
      {fresh.neverReached && t('clusters.freshness.neverReached')}
      {fresh.duration && <> · {t('clusters.freshness.staleFor', { duration: fresh.duration })}</>}
    </span>
  );
}
