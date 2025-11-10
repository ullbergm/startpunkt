package us.ullberg.startpunkt.service;

import io.fabric8.kubernetes.client.KubernetesClient;
import io.quarkus.logging.Log;
import io.quarkus.runtime.ShutdownEvent;
import io.quarkus.runtime.StartupEvent;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.event.Observes;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import us.ullberg.startpunkt.config.ClusterConfig;
import us.ullberg.startpunkt.config.ClustersConfig;

/**
 * Service for managing cluster configurations.
 *
 * <p>This service manages local Kubernetes client and remote GraphQL cluster configurations.
 */
@ApplicationScoped
public class MultiClusterService {

  private final KubernetesClient localClient;
  private final ClustersConfig clustersConfig;
  private final Map<String, ClusterConfig> clusterConfigs = new HashMap<>();

  /**
   * Constructor with injected local Kubernetes client and clusters configuration.
   *
   * @param localClient the local Kubernetes client (injected by Quarkus)
   * @param clustersConfig the clusters configuration (injected by Quarkus)
   */
  public MultiClusterService(KubernetesClient localClient, ClustersConfig clustersConfig) {
    this.localClient = localClient;
    this.clustersConfig = clustersConfig;
  }

  /** Initialize remote cluster configurations on startup. */
  void onStart(@Observes StartupEvent ev) {
    Log.info("Initializing multi-cluster service");

    // Log local cluster status (no need to add to clusterConfigs as it's handled separately)
    if (clustersConfig.local().enabled()) {
      String localClusterName = clustersConfig.local().name().orElse("local");
      Log.infof("Local cluster enabled with name '%s'", localClusterName);
    } else {
      Log.info("Local cluster disabled");
    }

    // Initialize remote GraphQL cluster configurations
    Optional<List<ClustersConfig.RemoteCluster>> remoteClusterConfigs = clustersConfig.remote();
    if (remoteClusterConfigs.isPresent() && !remoteClusterConfigs.get().isEmpty()) {
      List<ClustersConfig.RemoteCluster> configs = remoteClusterConfigs.get();
      Log.infof("Found %d remote GraphQL cluster configuration(s)", configs.size());

      for (ClustersConfig.RemoteCluster remoteConfig : configs) {
        if (remoteConfig.enabled()) {
          ClusterConfig config = toClusterConfig(remoteConfig);
          clusterConfigs.put(config.getName(), config);
          Log.infof(
              "Registered remote GraphQL cluster '%s' at %s",
              config.getName(), config.getGraphqlUrl());
        } else {
          Log.infof("Remote cluster '%s' is disabled, skipping", remoteConfig.name());
        }
      }
    } else {
      Log.info("No remote GraphQL clusters configured");
    }

    Log.info("Multi-cluster service initialization complete");
  }

  /**
   * Convert RemoteCluster interface to ClusterConfig POJO.
   *
   * @param remoteConfig the RemoteCluster configuration interface
   * @return the ClusterConfig POJO
   */
  private ClusterConfig toClusterConfig(ClustersConfig.RemoteCluster remoteConfig) {
    ClusterConfig config = new ClusterConfig();
    config.setName(remoteConfig.name());
    config.setEnabled(remoteConfig.enabled());
    config.setGraphqlUrl(remoteConfig.graphqlUrl());
    remoteConfig.graphqlToken().ifPresent(config::setGraphqlToken);
    return config;
  }

  /** Cleanup on shutdown. */
  void onStop(@Observes ShutdownEvent ev) {
    Log.info("Shutting down multi-cluster service");
    clusterConfigs.clear();
    Log.info("Multi-cluster service shutdown complete");
  }

  /**
   * Get the Kubernetes client for a specific cluster. Only returns a client for the local cluster.
   *
   * @param clusterName the cluster name
   * @return the Kubernetes client for local cluster, or null if not configured or remote
   */
  public KubernetesClient getClient(String clusterName) {
    // Check if this is the local cluster (either "local" or custom name)
    String localClusterName = clustersConfig.local().name().orElse("local");
    if (localClusterName.equalsIgnoreCase(clusterName) || "local".equalsIgnoreCase(clusterName)) {
      return clustersConfig.local().enabled() ? localClient : null;
    }
    // Remote clusters are GraphQL-only, no Kubernetes client
    return null;
  }

  /**
   * Get the local Kubernetes client.
   *
   * @return the local client, or null if disabled
   */
  public KubernetesClient getLocalClient() {
    return clustersConfig.local().enabled() ? localClient : null;
  }

  /**
   * Get all active cluster names (local + remote GraphQL clusters).
   *
   * @return list of cluster names
   */
  public List<String> getActiveClusterNames() {
    List<String> names = new ArrayList<>();

    // Add local cluster if enabled (always use "local" as identifier)
    if (clustersConfig.local().enabled()) {
      names.add("local");
    }

    // Add all remote GraphQL clusters from clusterConfigs
    names.addAll(clusterConfigs.keySet());

    return names;
  }

  /**
   * Get the number of active clusters.
   *
   * @return count of active clusters
   */
  public int getActiveClusterCount() {
    return getActiveClusterNames().size();
  }

  /**
   * Check if a cluster is configured and active.
   *
   * @param clusterName the cluster name
   * @return true if the cluster is active
   */
  public boolean isClusterActive(String clusterName) {
    // Check if this is the local cluster (either "local" or custom name)
    String localClusterName = clustersConfig.local().name().orElse("local");
    if (localClusterName.equalsIgnoreCase(clusterName) || "local".equalsIgnoreCase(clusterName)) {
      return clustersConfig.local().enabled();
    }
    return clusterConfigs.containsKey(clusterName);
  }

  /**
   * Get configuration for a specific cluster.
   *
   * @param clusterName the cluster name
   * @return the cluster configuration, or empty if not found
   */
  public Optional<ClusterConfig> getClusterConfig(String clusterName) {
    return Optional.ofNullable(clusterConfigs.get(clusterName));
  }

  /**
   * Get all active cluster configurations.
   *
   * @return map of cluster name to configuration
   */
  public Map<String, ClusterConfig> getAllClusterConfigs() {
    return new HashMap<>(clusterConfigs);
  }

  /**
   * Get the display name for the local cluster.
   *
   * @return the local cluster display name, or "local" if not configured
   */
  public String getLocalClusterDisplayName() {
    return clustersConfig.local().name().orElse("local");
  }
}
