import { useEffect } from 'preact/hooks';
import { Text } from 'preact-i18n';
import { Icon } from '@iconify/react';
import { useClusterPreferences } from './useClusterPreferences';

/**
 * ClusterSettings component - provides UI for filtering applications by cluster
 * 
 * Shows a dropdown menu with toggles for each available cluster.
 * Only visible when multiple clusters are available.
 */
export function ClusterSettings({ clusters }) {
  const clusterPrefs = useClusterPreferences();

  // Initialize cluster preferences when clusters become available
  useEffect(() => {
    if (clusters && clusters.length > 0) {
      clusterPrefs.initializeClusters(clusters);
    }
  }, [clusters]);

  // Don't render if no clusters or only one cluster
  if (!clusters || clusters.length <= 1) {
    return null;
  }

  const allEnabled = clusterPrefs.areAllClustersEnabled(clusters);
  const enabledCount = clusterPrefs.getEnabledCount();

  return (
    <>
      <svg xmlns="http://www.w3.org/2000/svg" class="d-none">
        <symbol id="server-network" viewBox="0 0 24 24">
          <path d="M13,18V20H17V22H7V20H11V18H3A1,1 0 0,1 2,17V4A1,1 0 0,1 3,3H21A1,1 0 0,1 22,4V17A1,1 0 0,1 21,18M4,5V15H20V5M13.5,6A2,2 0 0,1 15.5,8A2,2 0 0,1 13.5,10A2,2 0 0,1 11.5,8A2,2 0 0,1 13.5,6Z" />
        </symbol>
      </svg>

      <div class="dropdown bd-cluster-toggle position-relative">
        <button 
          class="btn btn-bd-primary py-2 dropdown-toggle d-flex align-items-center" 
          id="bd-cluster" 
          type="button"
          aria-expanded="false"
          data-bs-toggle="dropdown"
          aria-label="Cluster filter settings"
        >
          <svg class="bi my-1 theme-icon-active" width="1em" height="1em">
            <use href="#server-network"></use>
          </svg>
          <span class="visually-hidden" id="bd-cluster-text">
            <Text id="cluster.title">Cluster Filters</Text>
          </span>
        </button>
        {!allEnabled && (
          <span 
            class="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-info text-dark"
            style={{ fontSize: '0.6rem', padding: '0.15rem 0.35rem' }}
            aria-label={`${enabledCount} of ${clusters.length} clusters enabled`}
          >
            {enabledCount}
          </span>
        )}
        
        <div 
          class="dropdown-menu dropdown-menu-end shadow"
          aria-labelledby="bd-cluster-text"
          style="width: 275px; max-height: 80vh; overflow-y: auto;"
          onClick={(e) => e.stopPropagation()}
        >
          <div class="px-3 py-2">
            <h6 class="mb-2">
              <Text id="cluster.settings">Cluster Filters</Text>
            </h6>
            
            {/* Quick actions */}
            <div class="mb-3">
              <button 
                class="btn btn-sm btn-outline-primary w-100"
                onClick={() => clusterPrefs.enableAllClusters()}
                disabled={allEnabled}
                aria-label="Enable all clusters"
              >
                <Text id="cluster.enableAll">Enable All</Text>
              </button>
            </div>

            <hr class="my-2" />

            {/* Cluster list */}
            <div class="mb-2">
              {clusters.map((clusterName) => {
                const isEnabled = clusterPrefs.isClusterEnabled(clusterName);
                const isLocal = clusterName === 'local';
                
                return (
                  <div 
                    key={clusterName} 
                    class="d-flex align-items-center justify-content-between mb-2 p-2 rounded"
                    style={{ 
                      backgroundColor: 'var(--bs-secondary-bg)',
                      cursor: 'pointer'
                    }}
                    onClick={(e) => {
                      if (e.shiftKey) {
                        clusterPrefs.enableOnlyCluster(clusterName);
                      } else {
                        clusterPrefs.toggleCluster(clusterName);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        if (e.shiftKey) {
                          clusterPrefs.enableOnlyCluster(clusterName);
                        } else {
                          clusterPrefs.toggleCluster(clusterName);
                        }
                      }
                    }}
                    aria-label={`${clusterName} cluster - ${isEnabled ? 'enabled' : 'disabled'}. Click to toggle. Shift-click to enable only this cluster.`}
                  >
                    <span class="d-flex align-items-center">
                      <Icon 
                        icon={isLocal ? "mdi:laptop" : "mdi:server-network"} 
                        width="18" 
                        height="18" 
                        style={{ marginRight: '0.5rem' }}
                        aria-hidden="true"
                      />
                      <span class="small" style={{ fontWeight: isLocal ? '600' : 'normal' }}>
                        {clusterName}
                        {isLocal && (
                          <small class="text-muted ms-1">
                            (<Text id="cluster.local">local</Text>)
                          </small>
                        )}
                      </span>
                    </span>
                    <span 
                      class={`badge ${isEnabled ? 'bg-success' : 'bg-secondary'}`}
                      style={{ fontSize: '0.7rem' }}
                      aria-hidden="true"
                    >
                      {isEnabled ? (
                        <Text id="cluster.enabled">On</Text>
                      ) : (
                        <Text id="cluster.disabled">Off</Text>
                      )}
                    </span>
                  </div>
                );
              })}
            </div>

            <hr class="my-2" />

            {/* Help text */}
            <div class="small text-muted">
              <div>
                <Text id="cluster.help">
                  Disabled clusters will hide their applications from the view
                </Text>
              </div>
              <div class="mt-1">
                <Text id="cluster.shiftClickHelp">
                  Shift-click to show only that cluster
                </Text>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default ClusterSettings;
