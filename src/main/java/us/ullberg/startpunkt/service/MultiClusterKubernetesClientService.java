package us.ullberg.startpunkt.service;

import io.fabric8.kubernetes.client.Config;
import io.fabric8.kubernetes.client.ConfigBuilder;
import io.fabric8.kubernetes.client.KubernetesClient;
import io.fabric8.kubernetes.client.KubernetesClientBuilder;
import io.quarkus.logging.Log;
import io.quarkus.runtime.ShutdownEvent;
import io.quarkus.runtime.StartupEvent;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.event.Observes;
import java.io.File;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import us.ullberg.startpunkt.config.ClusterConfig;

/**
 * Service for managing multiple Kubernetes client connections.
 *
 * <p>This service creates and manages KubernetesClient instances for multiple clusters based on
 * configuration. It handles both local (in-cluster) and remote (kubeconfig-based) connections.
 */
@ApplicationScoped
public class MultiClusterKubernetesClientService {

  private final KubernetesClient localClient;
  private final Map<String, KubernetesClient> remoteClients = new HashMap<>();
  private final Map<String, ClusterConfig> clusterConfigs = new HashMap<>();

  @ConfigProperty(name = "startpunkt.clusters.local.enabled", defaultValue = "true")
  boolean localClusterEnabled;

  @ConfigProperty(name = "startpunkt.clusters.remote")
  Optional<List<ClusterConfig>> remoteClusterConfigs;

  /**
   * Constructor with injected local Kubernetes client.
   *
   * @param localClient the local Kubernetes client (injected by Quarkus)
   */
  public MultiClusterKubernetesClientService(KubernetesClient localClient) {
    this.localClient = localClient;
  }

  /** Initialize remote cluster connections on startup. */
  void onStart(@Observes StartupEvent ev) {
    Log.info("Initializing multi-cluster Kubernetes client service");

    // Register local cluster if enabled
    if (localClusterEnabled) {
      ClusterConfig localConfig = new ClusterConfig("local", null, true);
      clusterConfigs.put("local", localConfig);
      Log.info("Local cluster enabled");
    } else {
      Log.info("Local cluster disabled");
    }

    // Initialize remote clusters
    if (remoteClusterConfigs.isPresent()) {
      List<ClusterConfig> configs = remoteClusterConfigs.get();
      Log.infof("Found %d remote cluster configurations", configs.size());

      for (ClusterConfig config : configs) {
        if (config.isEnabled()) {
          try {
            initializeRemoteCluster(config);
          } catch (Exception e) {
            Log.errorf(
                e,
                "Failed to initialize remote cluster '%s': %s",
                config.getName(),
                e.getMessage());
          }
        } else {
          Log.infof("Remote cluster '%s' is disabled", config.getName());
        }
      }
    } else {
      Log.info("No remote cluster configurations found");
    }

    Log.infof("Multi-cluster service initialized with %d active clusters", getActiveClusterCount());
  }

  /** Close all remote Kubernetes clients on shutdown. */
  void onStop(@Observes ShutdownEvent ev) {
    Log.info("Shutting down multi-cluster Kubernetes client service");

    for (Map.Entry<String, KubernetesClient> entry : remoteClients.entrySet()) {
      try {
        Log.debugf("Closing Kubernetes client for cluster '%s'", entry.getKey());
        entry.getValue().close();
      } catch (Exception e) {
        Log.warnf(e, "Error closing Kubernetes client for cluster '%s'", entry.getKey());
      }
    }

    remoteClients.clear();
    clusterConfigs.clear();
    Log.info("Multi-cluster service shutdown complete");
  }

  /**
   * Initialize a remote cluster connection.
   *
   * @param config the cluster configuration
   * @throws IllegalArgumentException if the configuration is invalid
   */
  private void initializeRemoteCluster(ClusterConfig config) {
    String clusterName = config.getName();

    if (clusterName == null || clusterName.trim().isEmpty()) {
      throw new IllegalArgumentException("Cluster name cannot be null or empty");
    }

    if ("local".equalsIgnoreCase(clusterName)) {
      throw new IllegalArgumentException(
          "Cluster name 'local' is reserved for the local cluster");
    }

    String kubeconfigPath = config.getKubeconfigPath();
    if (kubeconfigPath == null || kubeconfigPath.trim().isEmpty()) {
      throw new IllegalArgumentException(
          "Kubeconfig path is required for remote cluster '" + clusterName + "'");
    }

    File kubeconfigFile = new File(kubeconfigPath);
    if (!kubeconfigFile.exists()) {
      throw new IllegalArgumentException(
          "Kubeconfig file does not exist: " + kubeconfigPath + " for cluster '" + clusterName + "'");
    }

    Log.infof("Initializing remote cluster '%s' with kubeconfig: %s", clusterName, kubeconfigPath);

    try {
      Config kubeConfig = Config.fromKubeconfig(kubeconfigPath);
      KubernetesClient client = new KubernetesClientBuilder().withConfig(kubeConfig).build();

      // Test the connection
      String version = client.getKubernetesVersion().getGitVersion();
      Log.infof("Connected to remote cluster '%s' (version: %s)", clusterName, version);

      remoteClients.put(clusterName, client);
      clusterConfigs.put(clusterName, config);
    } catch (Exception e) {
      throw new RuntimeException(
          "Failed to create Kubernetes client for cluster '"
              + clusterName
              + "' from kubeconfig: "
              + kubeconfigPath,
          e);
    }
  }

  /**
   * Get the Kubernetes client for a specific cluster.
   *
   * @param clusterName the cluster name
   * @return the Kubernetes client, or null if the cluster is not configured
   */
  public KubernetesClient getClient(String clusterName) {
    if ("local".equalsIgnoreCase(clusterName)) {
      return localClusterEnabled ? localClient : null;
    }
    return remoteClients.get(clusterName);
  }

  /**
   * Get the local Kubernetes client.
   *
   * @return the local client, or null if disabled
   */
  public KubernetesClient getLocalClient() {
    return localClusterEnabled ? localClient : null;
  }

  /**
   * Get all active cluster names.
   *
   * @return list of cluster names
   */
  public List<String> getActiveClusterNames() {
    List<String> names = new ArrayList<>();

    if (localClusterEnabled) {
      names.add("local");
    }

    names.addAll(remoteClients.keySet());
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
    if ("local".equalsIgnoreCase(clusterName)) {
      return localClusterEnabled;
    }
    return remoteClients.containsKey(clusterName);
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
}
