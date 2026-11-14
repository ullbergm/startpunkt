import { assignColors, orderClusters } from '../clusters';
import { t } from '../i18n';
import { freshnessText } from '../freshness';
import { setClusterShown, showOnlyCluster } from '../prefs';
import type { Cluster } from '../types';

// One button per cluster, to choose whose tiles are shown without opening
// the settings. A click shows that cluster alone, and a second click on it
// shows all again; with Shift, Ctrl or Command a click adds or removes one. Shown when there is more than one cluster. A cluster that is
// not connected says so in its name and with a mark.
export function ClusterChips({ clusters, shown: visible, now = Date.now() }: { clusters: Cluster[]; shown: string[]; now?: number }) {
  if (clusters.length < 2) return <span />;
  const ordered = orderClusters(clusters);
  const colors = assignColors(clusters);
  return (
    <div class="chips" role="group" aria-label={t('clusters.show')}>
      {ordered.map((cluster) => {
        const shown = visible.includes(cluster.name);
        const connected = cluster.local ? cluster.state !== 'stale' : cluster.state === 'connected';
        const freshness = freshnessText(cluster, now);
        const description = [connected ? '' : t('clusters.notConnected', { cluster: cluster.name }), freshness].filter(Boolean).join(' · ');
        return (
          <button
            key={cluster.name}
            type="button"
            class="chip"
            style={{ '--cluster': colors[cluster.name]! }}
            aria-pressed={shown}
            title={[connected ? t('clusters.hint') : t('clusters.notConnected', { cluster: cluster.name }), freshness].filter(Boolean).join(' · ')}
            aria-label={description ? (connected ? `${cluster.name}. ${description}` : description) : undefined}
            onClick={(event) => {
              // A plain click picks this cluster alone. With Shift, Ctrl or
              // Command held it is added to, or taken out of, what is shown.
              if (event.shiftKey || event.ctrlKey || event.metaKey) {
                setClusterShown(cluster.name, !shown);
              } else {
                showOnlyCluster(
                  cluster.name,
                  clusters.map((other) => other.name),
                  visible,
                );
              }
            }}
          >
            {cluster.name}
            {!connected && (
              <span class="chip-warning" aria-label={t('clusters.notConnected', { cluster: cluster.name })}>
                !
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
