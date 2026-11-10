import { t } from '../i18n';
import { setClusterShown } from '../prefs';
import type { Cluster } from '../types';

// One button per cluster, to show or hide its tiles without opening the
// settings. Shown when there is more than one cluster. A cluster that is
// not connected says so in its name and with a mark.
export function ClusterChips({ clusters, hidden }: { clusters: Cluster[]; hidden: string[] }) {
  if (clusters.length < 2) return <span />;
  const ordered = [...clusters].sort((a, b) => Number(b.local) - Number(a.local) || a.name.localeCompare(b.name));
  return (
    <div class="chips" role="group" aria-label={t('clusters.show')}>
      {ordered.map((cluster) => {
        const shown = !hidden.includes(cluster.name);
        const connected = cluster.local ? cluster.state !== 'stale' : cluster.state === 'connected';
        return (
          <button
            key={cluster.name}
            type="button"
            class="chip"
            aria-pressed={shown}
            title={connected ? undefined : t('clusters.notConnected', { cluster: cluster.name })}
            onClick={() => setClusterShown(cluster.name, !shown)}
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
